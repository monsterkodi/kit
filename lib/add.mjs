/*
  add.mjs — `kit add [path…]`

  Maps to `git add .` (no arguments) or `git add <path>…`.

  git add prints nothing on success, so "what did this command do?" is
  answered by rendering status afterwards. Delegating to the same renderer
  kit status uses keeps the output consistent across the two commands by
  construction rather than by duplicated logic.
*/

import { inRepo, run } from './git.mjs';
import { renderStatus } from './render.mjs';
import { collectStatus } from './git.mjs';

// The git argv for the requested paths.
export function addArgs(paths) {
  // A bare `git add` with no pathspec stages nothing and only prints a hint,
  // so the no-argument case must be spelled `git add .`.
    return paths.length > 0 ? ['add', ...paths] : ['add', '.'];
}

// `opts` is forwarded to the status renderer; `kit commit` sets committed, so
// the staged section reads as "committed".
export function add(paths, io = console, opts = {}) {
    if (!inRepo()) {
        io.error('kit add: not a git repository');
        return 128;
    }

    const r = run(addArgs(paths));
    if (!r.ok) {
        io.error('kit add: ' + (r.stderr.trim() || 'git add failed'));
        return r.code;
    }

    const { data } = collectStatus();
  // Clean tree stays silent, matching `kit status`.
    const out = renderStatus(data, opts);
    if (out) io.log(out);
    return 0;
}