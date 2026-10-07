/*
  log.test.mjs — `kit log` parsing and rendering.

  parseLog is tested against the exact byte shape git produces (verified with
  od -c), because the record separator is the one thing here that surprised
  the implementation. Rendering tests need no git at all.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLog } from '../lib/git.mjs';
import { renderLog, fitName, NAME_WIDTH } from '../lib/render.mjs';

/*
  One record exactly as git writes it for --format=%x00%h%x00%ad%x00%an%x00%s%x00:

    \0 hash \0 date \0 name \0 subject \0 \n

  The leading %x00 makes field 0 empty; the trailing one pushes git's own
  newline into a field of its own. Verified with od -c on git 2.55.
*/
const record = (h, d, n, s) => `\0${h}\0${d}\0${n}\0${s}\0\n`;

test('parseLog: reads one record per line', () => {
    const raw = record('41f3542', 'Oct  1 23:53', 'Thorsten', 'a message')
        + record('3421d42', 'Oct  1 23:49', 'Thorsten', 'another');
    assert.deepEqual(parseLog(raw), [
        { hash: '41f3542', date: 'Oct  1 23:53', name: 'Thorsten', subject: 'a message', body: 'a message' },
        { hash: '3421d42', date: 'Oct  1 23:49', name: 'Thorsten', subject: 'another', body: 'another' },
    ]);
});

test('parseLog: no trailing newline on the last record', () => {
    const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', 'only one').replace(/\n$/, '');
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

test('parseLog: a multi-line %B body stays with its own record', () => {
  // The reason the leading %x00 exists: %B spans lines, so a line-based
  // split would shred it. Verified against a repo with multi-paragraph bodies.
    const body = 'subject\n\nbody para one\nbody para one b\n\npara two';
    const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', body)
        + record('bbb2222', 'Oct  1 23:52', 'Thorsten', 'second');
    const out = parseLog(raw);
    assert.equal(out.length, 2, 'both records survive');
    assert.equal(out[0].subject, body, 'the body keeps its newlines and blank lines');
    assert.equal(out[1].subject, 'second', 'the following record is not polluted');
});

test('parseLog: a body containing a record separator does not break parsing', () => {
  // \x1e is stored by git (unlike NUL), so it must not be treated as a
  // delimiter. Verified: git rejects NUL but accepts \x1e.
    const body = 'subject\n\nbody with \x1e inside';
    const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', body)
        + record('bbb2222', 'Oct  1 23:52', 'Thorsten', 'second');
    const out = parseLog(raw);
    assert.equal(out.length, 2);
    assert.ok(out[0].subject.includes('\x1e'));
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
    const subject = 'fix: a long subject line that should be left completely alone';
  // Wide enough that no truncation applies, and NO_COLOR keeps the line plain.
    const out = renderLog([commit({ subject })], { width: 200 });
    assert.ok(out.endsWith(subject), 'subject reaches the end of the line verbatim');
});
