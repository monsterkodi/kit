// log.mjs — `kit log [n]`
//
//   kit log        one line per commit, the whole history
//   kit log 10     the 10 most recent commits
//
// The only argument is a commit count, passed straight through to `git log -n`.
// No named options, consistent with the rest of kit: flags are for git itself,
// not for kit.

import { inRepo, collectLog } from './git.mjs';
import { renderLog } from './render.mjs';

/**
 * Interpret the single optional argument.
 *
 * A bare number only. Anything else is an error naming the offending argument
 * rather than a silent fallback to the full history, which would be a
 * surprising amount of output to get from a typo.
 *
 * @returns {{ok:true, count:number|null} | {ok:false, message:string}}
 */
export function parseCount(arg) {
  if (arg === undefined) return { ok: true, count: null };
  if (!/^\d+$/.test(arg)) {
    return {
      ok: false,
      message: `kit log: '${arg}' is not a commit count (try: kit log 10)`,
    };
  }
  return { ok: true, count: Number(arg) };
}

/**
 * @param {string[]} args  argv after the subcommand; at most one item
 * @param {{log:Function, error:Function}} io
 * @returns {number} exit code
 */
export function log(args, io = console) {
  if (!inRepo()) {
    io.error('kit log: not a git repository');
    return 128;
  }

  const parsed = parseCount(args[0]);
  if (!parsed.ok) {
    io.error(parsed.message);
    return 1;
  }

  const { data, error } = collectLog(parsed.count);
  if (error) {
    io.error('kit log: ' + (error.stderr.trim() || 'git log failed'));
    return error.code;
  }

  // Empty history is silent, matching kit status on a clean tree.
  const out = renderLog(data);
  if (out) io.log(out);
  return 0;
}