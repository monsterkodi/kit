/*
  theme.test.mjs — the colour palette as a value rather than as ambient state.

  Colour used to be decided once, when theme.mjs was first imported, by reading
  NO_COLOR out of the environment. That made the environment the only switch, so
  the test suite had to run under NO_COLOR=1 to get readable assertions — and
  that also stripped colour from node's own test runner, which reports colour
  from the same variable. One flag, two unrelated consequences.

  So the palette is now built by a function of a boolean, and the renderers take
  it as an argument. The environment decides only once, where the CLI starts,
  and the tests below hand the renderers a plain palette directly. These tests
  pin that separation: a palette is a value, and the environment no longer
  reaches into rendering once the CLI has made its choice.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createTheme, theme } from '../lib/theme.mjs';
import { renderStatus, renderLog, renderEntry, renderCommitSuccess } from '../lib/render.mjs';
import { parseStatusV2 } from '../lib/git.mjs';

/*
  Global, so stripping removes every sequence rather than the first: a single
  palette call wraps the text in two sequences, and a non-global replace leaves
  the closing one behind and fails every comparison downstream.
*/
const SGR = /\u001b\[[0-9;]*m/g;

const strip = (s) => s.replace(SGR, '');

const tree = () =>
    parseStatusV2([
        '# branch.oid abc123def456',
        '# branch.head main',
        '1 A. N... 100644 100644 100644 a b src/new.mjs',
        '? build/',
    ].join('\0') + '\0');

const commit = { hash: 'c63ebbf', date: 'Oct  2 00:18', name: 'Thorsten', subject: 'third' };

/* Restores NO_COLOR after the callback, so one test cannot decide another's. */
function withNoColor(value, fn)
{
    const before = process.env.NO_COLOR;
    if (value === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = value;

    try
    {
        return fn();
    }
    finally
    {
        if (before === undefined) delete process.env.NO_COLOR;
        else process.env.NO_COLOR = before;
    }
}

test('createTheme: a plain palette emits no escape sequences', () => {
    const t = createTheme(false);
    assert.equal(t.enabled, false);

    for (const name of ['add', 'del', 'mod', 'untracked', 'branch', 'repoPath', 'dim', 'bold',
        'headStaged', 'headCommitted', 'headUnstaged', 'headUntracked', 'ahead', 'behind',
        'logHash', 'logDate', 'logName'])
    {
        assert.doesNotMatch(t[name]('x'), SGR, `${name} must not colour when disabled`);
    }
});

test('createTheme: an enabled palette colours, and passes text through', () => {
    const t = createTheme(true);
    assert.equal(t.enabled, true);

    // assert.doesNotMatch takes a regex and resets lastIndex between calls, so
    // the shared /g pattern is not safe to reuse as a matcher here.
    const hasColour = (s) => new RegExp(SGR).test(s);

    assert.ok(hasColour(t.add('x')), 'add colours');
    assert.ok(hasColour(t.dim('x')), 'dim colours');
    assert.ok(hasColour(t.branch('main')), 'branch colours');
    assert.equal(strip(t.dim('keep this')), 'keep this', 'the text survives the escape codes');
});

test('createTheme: both palettes render the same text once stripped', () => {
    const on = createTheme(true);
    const off = createTheme(false);

    for (const name of ['add', 'del', 'branch', 'repoPath', 'dim', 'logHash'])
    {
        assert.equal(strip(on[name]('x')), strip(off[name]('x')), name);
    }
});

/*
  The point of the refactor: rendering must not consult the environment at all.
  Each case sets NO_COLOR to the opposite of what a reader would expect and
  asserts the output is unchanged, so a renderer that reached back into
  process.env would fail rather than quietly pass.
*/
test('renderers: output does not depend on NO_COLOR once a palette is passed', () => {
    const plain = createTheme(false);

    const cases = {
        'status': () => renderStatus(tree(), { theme: plain }),
        'log': () => renderLog([commit], { theme: plain }),
        'entry': () => renderEntry({ path: 'a.mjs', code: 'M' }, { theme: plain }),
        'commit': () => renderCommitSuccess('[master e3cd348] fourth', { theme: plain }),
    };

    const unset = withNoColor(undefined, () => Object.fromEntries(
        Object.entries(cases).map(([k, fn]) => [k, fn()])));

    const set = withNoColor('1', () => Object.fromEntries(
        Object.entries(cases).map(([k, fn]) => [k, fn()])));

    for (const key of Object.keys(cases))
    {
        assert.equal(set[key], unset[key], `${key} must not read NO_COLOR`);
        assert.doesNotMatch(unset[key], SGR, `${key} must be plain when handed a plain palette`);
    }
});

/*
  A plain palette stays plain even when the environment says colour is wanted,
  and an enabled palette stays coloured even when it says the opposite. Both
  directions, because a one-way test passes an implementation that ignores its
  argument and always returns the default.
*/
test('renderers: the palette argument wins over the environment', () => {
    const enabled = createTheme(true);

    const forcedPlain = withNoColor('1', () => renderLog([commit], { theme: createTheme(false) }));
    assert.doesNotMatch(forcedPlain, SGR, 'an explicit plain palette beats NO_COLOR');

    const forcedColour = withNoColor(undefined, () => renderLog([commit], { theme: enabled }));
    assert.match(forcedColour, SGR, 'an explicit enabled palette survives an unset NO_COLOR');
});

/*
  The default palette the CLI uses is still the environment's answer, so `kit`
  itself behaves exactly as before: colour on a terminal, plain when piped or
  when NO_COLOR is set. This is the one place the environment is consulted, and
  it is consulted when the module is first loaded rather than on every call.
*/
test('theme: the default palette follows NO_COLOR as loaded', () => {
    const colour = withNoColor('1', () => createTheme(false));
    assert.equal(colour.enabled, false);

    const plain = withNoColor(undefined, () => createTheme(true));
    assert.equal(plain.enabled, true);

    assert.equal(typeof theme.enabled, 'boolean', 'the default export carries its own flag');
});

test('renderers: an omitted palette falls back to the default, not a crash', () => {
    const out = renderLog([commit], { width: 200 });
    assert.ok(out.includes('third'), 'the subject renders with no palette argument at all');
});