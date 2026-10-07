/*
  log.mjs — `kit log [-l|--long] [n]`

    kit log          one line per commit, truncated to the terminal width
    kit log 10       the 10 most recent commits
    kit log -l       the full message, wrapped under the subject column
    kit log -l 10    both

  A bare number is a commit count, passed straight through to `git log -n`.
  The only flag is -l/--long. No other named options: flags are for git itself,
  not for kit.
*/

import { inRepo, collectLog } from './git.mjs';
import { renderLog, DEFAULT_WIDTH } from './render.mjs';

// Interpret the arguments: an optional -l/--long, then an optional count.
export function parseArgs(args) {
    let long = false;
    const numbers = [];

    for (const arg of args) {
        if (arg === '-l' || arg === '--long') {
            long = true;
        } else if (/^\d+$/.test(arg)) {
            numbers.push(arg);
        } else {
      // A non-numeric, non-flag argument is an error naming the offending
      // argument, rather than a silent fallback that would dump the whole
      // history from a typo.
            return { ok: false, message: `kit log: '${arg}' is not a commit count (try: kit log 10)` };
        }
    }

    if (numbers.length > 1) {
        return { ok: false, message: `kit log: expected at most one commit count, got ${numbers.length}` };
    }

    return { ok: true, count: numbers.length ? Number(numbers[0]) : null, long };
}

/*
  Terminal width in columns, or a sane fallback.

  process.stdout.columns is accurate when stdout is a TTY (verified in a real
  pty). It is undefined when output is piped — including inside a $(...)
  substitution — so the fallback matters. 80 matches `tput cols` here.
*/
export function terminalWidth(out = process.stdout) {
    const cols = out?.columns;
    return Number.isInteger(cols) && cols > 0 ? cols : DEFAULT_WIDTH;
}

// `args` is argv after the subcommand. `env` overrides width and stream so
// tests are not at the mercy of the terminal they run in.
export function log(args, io = console, env = {}) {
    if (!inRepo()) {
        io.error('kit log: not a git repository');
        return 128;
    }

    const parsed = parseArgs(args);
    if (!parsed.ok) {
        io.error(parsed.message);
        return 1;
    }

    const { data, error } = collectLog(parsed.count, { long: parsed.long });
    if (error) {
        io.error('kit log: ' + (error.stderr.trim() || 'git log failed'));
        return error.code;
    }

    const width = env.width ?? terminalWidth(env.stream ?? process.stdout);

  // Empty history is silent, matching kit status on a clean tree.
    const out = renderLog(data, { width, long: parsed.long });
    if (out) io.log(out);
    return 0;
}