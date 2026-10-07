/*
  commit.mjs — `kit commit [words…]`

    kit commit                 -> git add . && git commit -m "misc"
    kit commit fix the prompt  -> git add . && git commit -m "fix the prompt"

  Words are joined with single spaces, reproducing the semantics of the bash
  function this replaces (`kc() { git add -u; git commit -m "$*"; }`). Note
  this is `git add .`, not `git add -u`: kit add stages new files too.

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
export function messageFor(words) {
    const joined = words.join(' ').trim();
    return joined === '' ? 'misc' : joined;
}

// `words` is argv after the subcommand.
export function commit(words, io = console) {
    if (!inRepo()) {
        io.error('kit commit: not a git repository');
        return 128;
    }

  // Show the staged state before committing — deliberate: seeing what is about
  // to be committed is the point of routing through kit add. The `committed`
  // flag labels that section and lowercases its letters, because this snapshot
  // is exactly the commit's contents rather than repo state.
    const staged = add([], io, { committed: true });
    if (staged !== 0) return staged;

    const r = run(['commit', '-m', messageFor(words)]);

    if (r.ok) {
        const out = renderCommitSuccess(r.stdout);
        if (out) io.log(out);
        return 0;
    }

  // git exits 1 for "nothing to commit" and prints a verbose block on stdout.
  //
  // Nothing reaching the index is a no-op, not a problem worth narrating: the
  // status tree printed just above already showed the whole repository state,
  // so anything else here is redundant. This matters most when `git add .`
  // cannot reach outside the current directory — then git's message blames
  // "untracked files present" even though the status tree right above us
  // already listed them. Silence is the honest answer.
    if (stagedCount() === 0) return r.code;

    const msg = renderCommitFailure(r.stdout);
    if (msg) io.log(msg);
  // Anything unexpected went to stderr; don't swallow it.
    if (r.stderr.trim()) io.error(r.stderr.trim());
    return r.code;
}