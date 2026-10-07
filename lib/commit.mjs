/*
  commit.mjs — `kit commit [words…]`

    kit commit                 -> git add . && git commit -m "misc"
    kit commit fix the prompt  -> git add . && git commit -m "fix the prompt"

  No --no-add toggle. kit commit always stages first; the rare case where
  only a subset should be committed is better served by plain git.
*/

import { inRepo, run, stagedCount } from './git.mjs';
import { add } from './add.mjs';
import { renderCommitSuccess, renderCommitFailure } from './render.mjs';

/*
  The commit message for a set of argv words.

  Falls back to "misc" for no words, and also when the joined result is empty
  (e.g. `kc ""`) so a stray empty argument still commits.
*/
export function messageFor(words)
{
    const joined = words.join(' ').trim();
    return joined === '' ? 'misc' : joined;
}

export function commit(words, io = console, { theme } = {})
{
    if (!inRepo())
    {
        io.error('kit commit: not a git repository');
        return 128;
    }

    const staged = add([], io, { committed: true, theme });
    if (staged !== 0) return staged;

    const r = run(['commit', '-m', messageFor(words)]);

    if (r.ok)
    {
        const out = renderCommitSuccess(r.stdout, { theme });
        if (out) io.log(out);
        return 0;
    }

    // Nothing reaching the index is a no-op, not a problem worth narrating: the
    // status tree printed just above already showed the whole repository state,
    if (stagedCount() === 0) return r.code;

    const msg = renderCommitFailure(r.stdout);
    if (msg) io.log(msg);
    if (r.stderr.trim()) io.error(r.stderr.trim());
    return r.code;
}
