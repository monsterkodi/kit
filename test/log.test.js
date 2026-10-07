/*
  log.test.js — `kit log` parsing and rendering.

  parseLog is tested against the exact byte shape git produces (verified with
  od -c), because the record separator is the one thing here that surprised
  the implementation. Rendering tests need no git at all.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLog } from '../lib/git.js';
import { renderLog, fitName, NAME_WIDTH } from '../lib/render.js';
import { createTheme } from '../lib/theme.js';
import { plainTheme } from './style.js';

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
    const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', 'first')
        + record('bbb2222', 'Oct  1 23:52', 'Thorsten', 'second');
    for (const c of parseLog(raw))
    {
        assert.ok(!c.hash.includes('\n'), 'hash must not contain a newline');
        assert.ok(!c.date.includes('\n'));
        assert.ok(!c.name.includes('\n'));
    }
});

test('parseLog: a multi-line %B body stays with its own record', () => {
    const body = 'subject\n\nbody para one\nbody para one b\n\npara two';
    const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', body)
        + record('bbb2222', 'Oct  1 23:52', 'Thorsten', 'second');
    const out = parseLog(raw);
    assert.equal(out.length, 2, 'both records survive');
    assert.equal(out[0].subject, body, 'the body keeps its newlines and blank lines');
    assert.equal(out[1].subject, 'second', 'the following record is not polluted');
});

test('parseLog: a body containing a record separator does not break parsing', () => {
    const body = 'subject\n\nbody with \x1e inside';
    const raw = record('aaa1111', 'Oct  1 23:53', 'Thorsten', body)
        + record('bbb2222', 'Oct  1 23:52', 'Thorsten', 'second');
    const out = parseLog(raw);
    assert.equal(out.length, 2);
    assert.ok(out[0].subject.includes('\x1e'));
});


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


const commit = (over = {}) => ({
    hash: 'abc1234', date: 'Oct  1 23:53', name: 'Thorsten', subject: 'a message', ...over,
});

test('renderLog: one line per commit', () => {
    const out = renderLog([commit(), commit({ hash: 'def5678', subject: 'another' })], { theme: plainTheme });
    assert.equal(out.split('\n').length, 2);
});

test('renderLog: empty history renders nothing', () => {
    assert.equal(renderLog([], { theme: plainTheme }), '');
    assert.equal(renderLog(null, { theme: plainTheme }), '');
});

test('renderLog: fields appear in order', () => {
    const out = renderLog([commit()], { theme: plainTheme });
    assert.equal(out, 'abc1234 Oct  1 23:53 Thorsten a message');
});

test('renderLog: subject column aligns across rows regardless of name length', () => {
    const out = renderLog([
        commit({ name: 'Thorsten', subject: 'long-ish subject' }),
        commit({ name: 'zoe', subject: 'x' }),
    ], { theme: plainTheme });
    const positions = out.split('\n').map((l) => l.indexOf('x') >= 0 ? l.indexOf('x') : -1);
    const firstSubject = out.split('\n')[0].indexOf('long-ish subject');
    assert.equal(positions[1], firstSubject);
});

test('renderLog: colours each column differently', () => {
    // An enabled palette is passed in, so this asserts on colour unconditionally.
    // It used to return early under NO_COLOR, which meant the only test pinning
    // the palette never ran as part of `npm test`.
    const out = renderLog([commit()], { theme: createTheme(true) });
    // The colour code is the last number in the sequence: 38;5;245 is grey, and
    // the 38 is the "set foreground" selector rather than part of the colour.
    const codes = out.match(/\u001b\[38;5;\d+m/g).map((s) => s.match(/\d+(?=m$)/)[0]);
    assert.deepEqual(codes, ['245', '39', '41'], 'grey hash, blue date, green name');
});

test('renderLog: the same commit rendered plain has no escapes at all', () => {
    const out = renderLog([commit()], { theme: createTheme(false) });
    assert.doesNotMatch(out, /\u001b\[/, 'a plain palette emits nothing');
    assert.match(out, /a message/, 'and the subject is still there');
});

test('renderLog: subject is never truncated or recoloured', () => {
    const subject = 'fix: a long subject line that should be left completely alone';
    const out = renderLog([commit({ subject })], { width: 200 });
    assert.ok(out.endsWith(subject), 'subject reaches the end of the line verbatim');
});
