/*
  status.mjs — `kit status`

  Silent when the tree is clean (exit 0, no output at all). When dirty,
  renders the branch header and the staged/unstaged/untracked tree.
*/

import { collectStatus, inRepo } from './git.mjs';
import { renderStatus } from './render.mjs';

/**
 * @param {{write:(s:string)=>void}} io  injected output sink (for tests)
 * @returns {number} process exit code
 */
export function status(io = console) {
  if (!inRepo()) {
    io.error('kit status: not a git repository');
    return 128;
  }

  const { data, error } = collectStatus();
  if (error) {
    io.error('kit status: ' + (error.stderr.trim() || 'git status failed'));
    return error.code;
  }

  const out = renderStatus(data);
  if (out) io.log(out);
  return 0;
}