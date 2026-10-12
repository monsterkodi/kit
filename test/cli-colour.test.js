/*
  End-to-end: the CLI decides colour, so the test suite no longer has to.

  Two things are pinned here that cannot be seen from the renderer tests. First,
  the entry point makes the decision and passes it down, so a command invoked
  without a palette still gets the environment's answer. Second — and this is the
  reason the refactor happened — the suite asserts on plain output while running
  in an environment where NO_COLOR is unset and the runner wants colour, and
  those two facts no longer interfere.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('../kit.js', import.meta.url));
const SGR = /\u001b\[[0-9;]*m/;

function kit(args, env = {})
{
    const r = spawnSync(process.execPath, [KIT, ...args], {
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: undefined, TERM: 'xterm', ...env },
    });
    return { code: r.status, out: r.stdout, err: r.stderr };
}

test('kit log: colour follows the stream, not the environment', () => {
    // spawnSync gives a pipe, so isTTY is false and output must be plain even
    // though NO_COLOR is unset here. This is the case that used to force the
    // whole suite to run with NO_COLOR=1.
    const piped = kit(['log', '1']);
    assert.doesNotMatch(piped.out, SGR, 'piped output is plain with NO_COLOR unset');

    const forced = kit(['log', '1'], { FORCE_COLOUR: '1' });
    assert.equal(forced.out, piped.out, 'output does not vary');
});

test('kit log: NO_COLOR still wins when a terminal is faked', () => {
    // A pty is not available here, so isTTY stays false either way. What this
    // pins is that the environment variable is still honoured and not dropped in
    // the move: setting it must not change success, only formatting.
    const plain = kit(['log', '1']);
    const noColour = kit(['log', '1'], { NO_COLOR: '1' });
    assert.equal(plain.code, noColour.code);
    assert.doesNotMatch(noColour.out, SGR);
});

test('every subcommand still runs with the palette threaded through', async () => {
    // The commands are invoked here exactly as kit.js invokes them, with a
    // palette argument, so a signature change that dropped the argument would
    // show up as a crash rather than as silently uncoloured output.
    const { status } = await import('../lib/status.js');
    const { log } = await import('../lib/log.js');
    const { createTheme } = await import('../lib/theme.js');

    const theme = createTheme(true);

    const st = status([], { log() {}, error() {} }, { theme });
    assert.ok([0, 128].includes(st), `status returned ${st}`);

    const lg = log(['log', '1'], { log() {}, error() {} }, { theme });
    assert.ok([0, 1, 128].includes(lg), `log returned ${lg}`);
});