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

export function addArgs(paths)
{
    return paths.length > 0 ? ['add', ...paths] : ['add', '.'];
}

export function add(paths, io = console, opts = {})
{
    if (!inRepo())
    {
        io.error('kit add: not a git repository');
        return 128;
    }

    const r = run(addArgs(paths));
    if (!r.ok)
    {
        io.error('kit add: ' + (r.stderr.trim() || 'git add failed'));
        return r.code;
    }

    const { data } = collectStatus();
    const out = renderStatus(data, opts);
    if (out) io.log(out);
    return 0;
}