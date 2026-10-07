/*
  layout.test.mjs — `kit log` width handling and the --long layout.

  All pure: renderLog takes the width as data, so no TTY and no git are needed.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    renderLog, truncate, wrap, displayWidth, fitName,
    PREFIX_WIDTH, NARROW_WIDTH, MIN_MESSAGE_WIDTH, DEFAULT_WIDTH,
} from '../lib/render.mjs';
import { parseArgs, terminalWidth } from '../lib/log.mjs';

const plain = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');
const widths = (s) => plain(s).split('\n').map((l) => displayWidth(l));

const LONG_SUBJECT =
    'AGENTS.md: replace rules satisfiable by sounding thoughtful with checkable ones';

const commit = (over = {}) => ({
    hash: 'f9c98c7',
    date: 'Oct  1 04:32',
    name: 'opencode',
    subject: LONG_SUBJECT,
    body: LONG_SUBJECT,
    ...over,
});

// --- the prefix ----------------------------------------------------------

test('PREFIX_WIDTH matches the real rendered prefix', () => {
    // 7 hash + 1 + 12 date + 1 + 8 name + 1. The date is 12 because git's %e
    // pads the day to two characters, which is a bug this constant once got wrong.
    assert.equal(PREFIX_WIDTH, 30);
    const line = plain(renderLog([commit({ subject: 'x' })], { width: 100 }));
    assert.equal(displayWidth(line), PREFIX_WIDTH + 1);
});

test('a short subject is left untouched', () => {
    const out = plain(renderLog([commit({ subject: 'short one' })], { width: 100 }));
    assert.match(out, /short one$/);
    assert.ok(!out.includes('…'));
});

// --- truncation ----------------------------------------------------------

test('truncate: leaves short text alone and marks the cut otherwise', () => {
    assert.equal(truncate('short', 20), 'short');
    const cut = truncate('abcdefghij', 5);
    assert.equal(cut, 'abcd…');
    assert.equal(displayWidth(cut), 5, 'the result is exactly the requested width');
});

test('truncate: the ellipsis is a single glyph, not three dots', () => {
    assert.ok(truncate('abcdefghij', 5).endsWith('…'));
    assert.ok(!truncate('abcdefghij', 5).endsWith('...'));
});

test('a long subject is truncated to the width', () => {
    const out = plain(renderLog([commit()], { width: 100 }));
    assert.equal(Math.max(...widths(out)), 100);
    assert.ok(out.includes('…'), 'truncation is marked');
    assert.ok(out.includes('AGENTS.md:'), 'the start of the message survives');
});

test('output never exceeds the width when the budget allows', () => {
    for (const w of [70, 80, 90, 100, 111, 120, 160, 190]) {
        const out = plain(renderLog([commit()], { width: w }));
        assert.ok(Math.max(...widths(out)) <= w, `width ${w} must not overflow`);
    }
});

test('below the minimum message width, the message is left long rather than mangled', () => {
    // Widths 60-69 leave fewer than MIN_MESSAGE_WIDTH columns for the message.
    // The documented trade-off: a stub is worse than an overflow.
    assert.equal(NARROW_WIDTH, 60);
    assert.equal(MIN_MESSAGE_WIDTH, 40);
    const out = plain(renderLog([commit()], { width: 65 }));
    // Below the floor the message is emitted whole and the terminal wraps it —
    // deliberately over the width, because a 35-column stub is less use.
    assert.equal(Math.max(...widths(out)), PREFIX_WIDTH + LONG_SUBJECT.length);
    assert.ok(!out.includes('…'), 'no truncation below the floor');
    assert.ok(out.includes(LONG_SUBJECT), 'the whole message is present');
});

test('the narrow layout never overflows, even at absurd widths', () => {
    for (const w of [30, 40, 50, 59]) {
        const out = plain(renderLog([commit()], { width: w }));
        assert.ok(Math.max(...widths(out)) <= w, `width ${w} must not overflow`);
    }
});

// --- narrow layout -------------------------------------------------------

test('below NARROW_WIDTH the message goes on its own line', () => {
    const out = plain(renderLog([commit({ subject: 'a message here' })], { width: 50 }));
    const lines = out.split('\n');
    assert.equal(lines.length, 2, 'prefix on one line, message on the next');
    assert.match(lines[0], /^f9c98c7 Oct {2}1 04:32 opencode$/);
    assert.match(lines[1], /^ {2}a message here$/, 'message is indented by 2');
});

test('the narrow layout still truncates a long message', () => {
    const out = plain(renderLog([commit()], { width: 50 }));
    assert.ok(out.includes('…'));
    assert.ok(Math.max(...widths(out)) <= 50);
});

// --- wrapping ------------------------------------------------------------

test('wrap: breaks on spaces and respects the width', () => {
    const lines = wrap('the quick brown fox jumps over the lazy dog', 15);
    for (const l of lines) assert.ok(displayWidth(l) <= 15, `"${l}" fits`);
    assert.equal(lines.join(' '), 'the quick brown fox jumps over the lazy dog');
});

test('wrap: preserves blank lines between paragraphs', () => {
    const lines = wrap('one\n\ntwo', 20);
    assert.deepEqual(lines, ['one', '', 'two']);
});

test('wrap: hard-splits a word longer than the width', () => {
    const lines = wrap('x'.repeat(25), 10);
    assert.equal(lines.length, 3, '25 characters at width 10 is 10 + 10 + 5');
    for (const l of lines) assert.ok(displayWidth(l) <= 10);
    assert.equal(lines.join('').length, 25, 'no characters are lost');
});

test('--long indents continuation lines under the subject column', () => {
    const out = plain(renderLog([commit()], { width: 80, long: true }));
    const lines = out.split('\n');
    assert.ok(lines.length > 1, 'the message wraps');
    for (const l of lines.slice(1)) {
        assert.ok(l.startsWith(' '.repeat(PREFIX_WIDTH)), 'continuations align');
    }
    assert.ok(Math.max(...widths(out)) <= 80);
});

test('--long keeps a blank paragraph break, without trailing spaces on it', () => {
    const body = 'subject\n\nfirst para\n\nsecond para';
    const out = plain(renderLog([commit({ subject: body, body })], { width: 80, long: true }));
    assert.ok(out.includes('\n\n'), 'the paragraph break survives');
    for (const line of out.split('\n')) {
        assert.equal(line, line.replace(/\s+$/, ''), 'no trailing whitespace');
    }
});

test('--long shows more than the subject alone', () => {
    const body = 'the subject\n\nA body paragraph that git log --oneline would hide.';
    const short = plain(renderLog([commit({ subject: body, body })], { width: 80 }));
    const long = plain(renderLog([commit({ subject: body, body })], { width: 80, long: true }));
    assert.ok(long.includes('A body paragraph'), 'the body is shown');
    assert.ok(!short.includes('A body paragraph'), 'short mode shows the subject only');
});

// --- width measurement ---------------------------------------------------

test('displayWidth counts an em-dash as one column, not two bytes', () => {
    assert.equal(displayWidth('a—b'), 3);
    assert.equal(displayWidth('…'), 1);
    assert.equal(displayWidth(''), 0);
});

test('truncation accounts for multi-byte characters', () => {
    const t = truncate('aa—bb—cc—dd', 6);
    assert.equal(displayWidth(t), 6);
});

// --- argument parsing ----------------------------------------------------

test('parseArgs: no arguments is short mode, whole history', () => {
    assert.deepEqual(parseArgs([]), { ok: true, count: null, long: false });
});

test('parseArgs: a bare number is a commit count', () => {
    assert.deepEqual(parseArgs(['10']), { ok: true, count: 10, long: false });
    assert.deepEqual(parseArgs(['0']), { ok: true, count: 0, long: false });
});

test('parseArgs: -l and --long both mean long mode', () => {
    assert.deepEqual(parseArgs(['-l']), { ok: true, count: null, long: true });
    assert.deepEqual(parseArgs(['--long']), { ok: true, count: null, long: true });
});

test('parseArgs: the flag and a count combine in either order', () => {
    assert.deepEqual(parseArgs(['-l', '5']), { ok: true, count: 5, long: true });
    assert.deepEqual(parseArgs(['5', '-l']), { ok: true, count: 5, long: true });
    assert.deepEqual(parseArgs(['5', '--long']), { ok: true, count: 5, long: true });
});

test('parseArgs: bad arguments are rejected, not silently ignored', () => {
    for (const bad of [['foo'], ['-x'], ['1.5'], ['']]) {
        const r = parseArgs(bad);
        assert.equal(r.ok, false, `${JSON.stringify(bad)} rejected`);
        assert.match(r.message, /not a commit count/);
    }
});

test('parseArgs: more than one count is an error', () => {
    const r = parseArgs(['1', '2']);
    assert.equal(r.ok, false);
    assert.match(r.message, /at most one/);
});

// --- terminal width ------------------------------------------------------

test('terminalWidth uses the stream width when it is a real terminal', () => {
    assert.equal(terminalWidth({ columns: 120 }), 120);
    assert.equal(terminalWidth({ columns: 40 }), 40);
});

test('terminalWidth falls back when the value is unusable', () => {
    // Piped output, or a command substitution, gives undefined; 0 is seen in an
    // unsized pty. Both must fall back rather than produce a broken layout.
    for (const bad of [undefined, null, 0, -1, NaN, '80']) {
        assert.equal(terminalWidth({ columns: bad }), DEFAULT_WIDTH, `${bad} falls back`);
    }
    assert.equal(DEFAULT_WIDTH, 80);
});

test('fitName still pads or crops to 8', () => {
    assert.equal(fitName('Thorsten'), 'Thorsten');
    assert.equal(fitName('zoe'), 'zoe     ');
    assert.equal(fitName('Christopher'), 'Christop');
});