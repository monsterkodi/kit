// log.test.mjs — `kit log` parsing and rendering.
//
// parseLog is tested against the exact byte shape git produces (verified with
// od -c), because the record separator is the one thing here that surprised
// the implementation. Rendering tests need no git at all.

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLog } from '../lib/git.mjs';
import { renderLog, fitName, NAME_WIDTH } from '../lib/render.mjs';
import { parseCount } from '../lib/log.mjs';

// One record as git writes it: four NUL-separated fields, then the format's
// own terminator, then git's newline. Observed with od -c on git 2.55.
const record = (h, d, n, s) => `${h}\0${d}\0${n}\0${s}\0\0\n`;

test('parseLog: reads one record per line', () => {
  const raw = record('41f3542', 'Oct  1 23:53', 'Thorsten', 'a message')
    + record('3421d42', 'Oct  1 23:49', 'Thorsten', 'another');
  assert.deepEqual(parseLog(raw), [
    { hash: '41f3542', date: 'Oct  1 23:53', name: 'Thorsten', subject: 'a message' },
    { hash: '3421d42', date: 'Oct  1 23:49', name: 'Thorsten', subject: 'another' },
  ]);
});

test('parseLog: no trailing newline on the last record', () => {
  const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', 'only one').trimEnd();
  const out = parseLog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].subject, 'only one');
});

test('parseLog: empty input yields nothing', () => {
  assert.deepEqual(parseLog(''), []);
  assert.deepEqual(parseLog('\n'), []);
});

test('parseLog: subject containing spaces and colons survives intact', () => {
  const subject = 'fix: handle empty tree and  spaces';
  const out = parseLog(record('abc1234', 'Oct  1 23:53', 'Thorsten', subject));
  assert.equal(out[0].subject, subject);
});

test('parseLog: unicode author and subject survive', () => {
  const out = parseLog(record('abc1234', 'Jun 15 14:30', 'Zoë Müller', 'ünïcödé ✓'));
  assert.equal(out[0].name, 'Zoë Müller');
  assert.equal(out[0].subject, 'ünïcödé ✓');
});

test('parseLog: no newline leaks into the next record hash', () => {
  // The bug this guards: git writes "\0\n" between records, so a parser that
  // splits only on NUL sees a leading newline on every hash after the first.
  const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', 'first')
    + record('bbb2222', 'Oct  1 23:52', 'Thorsten', 'second');
  for (const c of parseLog(raw)) {
    assert.ok(!c.hash.includes('\n'), 'hash must not contain a newline');
    assert.ok(!c.date.includes('\n'));
    assert.ok(!c.name.includes('\n'));
  }
});

// --- fitName -------------------------------------------------------------

test('fitName: pads to exactly 8 characters', () => {
  assert.equal(NAME_WIDTH, 8);
  assert.equal(fitName('Thorsten'), 'Thorsten');
  assert.equal(fitName('opencode'), 'opencode');
  assert.equal(fitName('zoe'), 'zoe     ');
  assert.equal(fitName('zoe').length, 8);
});

test('fitName: crops names longer than 8', () => {
  assert.equal(fitName('Christopher'), 'Christop');
  assert.equal(fitName('Thorsten Kohnhorst'), 'Thorsten');
});

test('fitName: handles empty and missing names', () => {
  assert.equal(fitName(''), '        ');
  assert.equal(fitName(undefined), '        ');
});

// --- renderLog -----------------------------------------------------------

const commit = (over = {}) => ({
  hash: 'abc1234', date: 'Oct  1 23:53', name: 'Thorsten', subject: 'a message', ...over,
});

test('renderLog: one line per commit', () => {
  const out = renderLog([commit(), commit({ hash: 'def5678', subject: 'another' })]);
  assert.equal(out.split('\n').length, 2);
});

test('renderLog: empty history renders nothing', () => {
  assert.equal(renderLog([]), '');
  assert.equal(renderLog(null), '');
});

test('renderLog: fields appear in order', () => {
  const out = renderLog([commit()]);
  assert.equal(out, 'abc1234 Oct  1 23:53 Thorsten a message');
});

test('renderLog: subject column aligns across rows regardless of name length', () => {
  const out = renderLog([
    commit({ name: 'Thorsten', subject: 'long-ish subject' }),
    commit({ name: 'zoe', subject: 'x' }),
  ]);
  const positions = out.split('\n').map((l) => l.indexOf('x') >= 0 ? l.indexOf('x') : -1);
  // The second row's subject starts where the first row's subject column does.
  const firstSubject = out.split('\n')[0].indexOf('long-ish subject');
  assert.equal(positions[1], firstSubject);
});

test('renderLog: colours each column differently', () => {
  const out = renderLog([commit()]);
  if (process.env.NO_COLOR) return; // colour assertions need colour enabled
  const codes = out.match(/\u001b\[38;5;\d+m/g).map((s) => s.match(/\d+/)[0]);
  assert.deepEqual(codes, ['245', '39', '41'], 'grey hash, blue date, green name');
});

test('renderLog: subject is never truncated or recoloured', () => {
  const subject = 'fix: a very long subject line that should be left completely alone';
  const out = renderLog([commit({ subject })]);
  assert.ok(out.endsWith(subject), 'subject reaches the end of the line verbatim');
});

// --- parseCount ----------------------------------------------------------

test('parseCount: no argument means the whole history', () => {
  assert.deepEqual(parseCount(undefined), { ok: true, count: null });
});

test('parseCount: a bare number is a commit count', () => {
  assert.deepEqual(parseCount('10'), { ok: true, count: 10 });
  assert.deepEqual(parseCount('0'), { ok: true, count: 0 });
});

test('parseCount: non-numeric arguments are rejected, not silently ignored', () => {
  for (const bad of ['foo', '-5', '1.5', '10x', '', ' ']) {
    const r = parseCount(bad);
    assert.equal(r.ok, false, `'${bad}' should be rejected`);
    assert.match(r.message, /not a commit count/);
  }
});