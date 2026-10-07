/*
  status.js — `kit status [path…]`

    kit status                  the repository the shell is in
    kit status ~/a ~/s/kit      one report per path, in the order given

  A path is resolved against the directory kit was started in, never against a
  path reported before it, so `kit status . ../config` reads the way it looks:
  here, and my sibling. With no arguments at all the shell's own directory is
  the only path; passing arguments replaces it rather than adding to it, so
  `kit status ~/s/kit` from a dirty ~/a says nothing about ~/a.

  Silence is per path, not per run: a clean repository prints nothing whatever,
  so a run over four of them shows only the ones with something to say. A path
  that cannot be reported — no such directory, no repository, no work tree — is
  named on stderr, the remaining paths are still reported, and the exit code is
  then 128, which is what git itself uses for "not a repository".
*/

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { collectStatus, repoProblem } from './git.js';
import { renderStatus, abbreviateHome } from './render.js';

export function status(args = [], io = console, { theme } = {})
{
    const dirs = (args.length > 0 ? args : ['.']).map((a) => resolve(a));
    let code = 0;

    for (const dir of dirs)
    {
        const label = abbreviateHome(dir);

        if (!existsSync(dir))
        {
            io.error(`kit status: ${label}: no such directory`);
            code = 128;
            continue;
        }

        const problem = repoProblem(dir);
        if (problem)
        {
            io.error(`kit status: ${label}: ${problem}`);
            code = 128;
            continue;
        }

        const { data, error } = collectStatus(dir);
        if (error)
        {
            io.error('kit status: ' + (error.stderr.trim() || 'git status failed'));
            if (code === 0) code = error.code;
            continue;
        }

        const out = renderStatus(data, { theme });
        if (out) io.log(out);
    }

    return code;
}
