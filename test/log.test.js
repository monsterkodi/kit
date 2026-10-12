/*
  log.test.js — `kit log` parsing and rendering.

  parseLog is tested against the exact byte shape git produces (verified with
  od -c), because the record separator is the one thing here that surprised
  the implementation. Rendering tests need no git at all.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLog } from '../lib/git.js';
import { renderLog, fitName, collapseDates, NAME_WIDTH } from '../lib/render.js';
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


/*
  A date that repeats the line above it is blanked, so a run of commits reads
  as one block rather than a column of the same month repeated.

  The rule runs over whole fields, left to right: blank the month when it is
  the same month as the commit above, and the day too when it is the same day.
  A different month ends the run — so the day is written out again, which is
  why "Oct 9" does not make "Nov 9" print a bare 9. The time is a value, not a
  grouping, and is always written.
*/
const dated = (...dates) => dates.map((date, i) => commit({ hash: 'abc1234', date, subject: `m${i}` }));

test('collapseDates: the first date is always written out in full', () => {
    assert.deepEqual(collapseDates(dated('Nov  9 00:00')), ['Nov  9 00:00']);
});

test('collapseDates: a repeated day keeps only its time', () => {
    const out = collapseDates(dated('Oct  1 14:00', 'Oct  1 15:00'));
    assert.deepEqual(out, ['Oct  1 14:00', '       15:00']);
});

test('collapseDates: the same month on another day blanks the month alone', () => {
    const out = collapseDates(dated('Oct  1 14:00', 'Oct  5 00:01'));
    assert.deepEqual(out, ['Oct  1 14:00', '     5 00:01']);
});

test('collapseDates: a new month is written out in full again', () => {
    const out = collapseDates(dated('Oct  9 12:00', 'Nov  9 00:00'));
    assert.deepEqual(out, ['Oct  9 12:00', 'Nov  9 00:00'],
        'the shared day 9 is not enough to carry the date forward');
});

test('collapseDates: a repeated day number is kept whole, not cut into the digits', () => {
    // 'Nov 10' -> 'Nov 13' shares four characters but only the month is a field,
    // so the day reads 13 rather than a stranded 3.
    const out = collapseDates(dated('Nov  9 00:00', 'Nov 10 10:10', 'Nov 13 12:11'));
    assert.deepEqual(out, ['Nov  9 00:00', '    10 10:10', '    13 12:11']);
});

test('collapseDates: the comparison is against the date above, not the line as printed', () => {
    // Three days running: once the month is gone from the display it must still
    // count as the same month for the commit that follows it.
    const out = collapseDates(dated('Oct  1 14:00', 'Oct  1 15:00', 'Oct  2 09:30'));
    assert.deepEqual(out, ['Oct  1 14:00', '       15:00', '     2 09:30']);
});

test('collapseDates: blanking is only ever spaces, so the width never moves', () => {
    const raw = ['Oct  1 14:00', 'Oct  5 00:01', 'Nov  9 00:00', 'Nov 10 10:10'];
    const out = collapseDates(dated(...raw));
    for (const [i, date] of out.entries()) assert.equal(date.length, raw[i].length);
});

test('collapseDates: a run of commits across months and days', () => {
    const out = collapseDates(dated(
        'Oct  1 14:00',
        'Oct  1 15:00',
        'Oct  5 00:01',
        'Oct  5 12:13',
        'Oct  6 12:00',
        'Oct  9 12:00',
        'Nov  9 00:00',
        'Nov 10 10:10',
        'Nov 13 12:11',
    ));
    assert.deepEqual(out, [
        'Oct  1 14:00',
        '       15:00',
        '     5 00:01',
        '       12:13',
        '     6 12:00',
        '     9 12:00',
        'Nov  9 00:00',
        '    10 10:10',
        '    13 12:11',
    ]);
});

test('renderLog: a repeated date is blanked on the line below', () => {
    const out = renderLog(dated('Oct  1 14:00', 'Oct  1 15:00'), { theme: plainTheme });
    assert.equal(out.split('\n')[1], 'abc1234        15:00 Thorsten m1');
});

test('renderLog: blanking a date leaves the subject column where it was', () => {
    const out = renderLog(dated('Oct  1 14:00', 'Oct  1 15:00', 'Nov  9 00:00'), { theme: plainTheme });
    const columns = out.split('\n').map((l) => l.indexOf('Thorsten'));
    assert.equal(new Set(columns).size, 1, 'every line puts the name in the same column');
});

test('renderLog: -l writes every date out in full', () => {
    const out = renderLog(dated('Oct  1 14:00', 'Oct  1 15:00'), { theme: plainTheme, long: true });
    assert.equal(out.split('\n')[1], 'abc1234 Oct  1 15:00 Thorsten m1');
});

test('renderLog: a blanked date is still coloured as one column', () => {
    const out = renderLog(dated('Oct  1 14:00', 'Oct  1 15:00'), { theme: createTheme(true) });
    const codes = out.split('\n')[1].match(/\u001b\[38;5;\d+m/g).map((s) => s.match(/\d+(?=m$)/)[0]);
    assert.deepEqual(codes, ['245', '39', '41'], 'grey hash, blue date, green name');
});

test('renderLog: the narrow layout blanks a repeated date too', () => {
    const out = renderLog(dated('Oct  1 14:00', 'Oct  1 15:00'), { theme: plainTheme, width: 50 });
    const lines = out.split('\n');
    assert.match(lines[2], /^abc1234 {8}15:00 Thorsten$/, 'the date is blanked, the time is not');
});
