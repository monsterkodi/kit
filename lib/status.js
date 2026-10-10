/*
  status.js — `kit status [path…]`

    kit status                  the repository the shell is in
    kit status ~/a ~/s/kit      one report per path, in the order given
    kit status ~/s              the repositories one level below a plain directory

  A path is resolved against the directory kit was started in, never against a
  path reported before it, so `kit status . ../config` reads the way it looks:
  here, and my sibling. With no arguments at all the shell's own directory is
  the only path; passing arguments replaces it rather than adding to it, so
  `kit status ~/s/kit` from a dirty ~/a says nothing about ~/a.

  A directory that is not a repository is looked into one level down, so
  `kit status ~/s` says something about ~/s/kit rather than that ~/s is not a
  repository. One level is the whole of the rule: deeper than that is a guess
  about what a person meant. A path that is a repository is reported and not
  descended into, so a repository that happens to hold another one says only
  what it has to say.

  Silence is per path, not per run: a clean repository says nothing, so a run over
  four of them shows only the ones with something to say — and a clean one that is
  ahead of or behind its upstream is one of them, since a branch waiting on a push
  or a pull has something to say. A path that cannot be reported — no such
  directory, no repository, no work tree — is named on stderr, the remaining paths
  are still reported, and the exit code is then 128, which is what git itself uses
  for "not a repository".
*/

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { collectStatus, repoProblem } from './git.js';
import { renderStatus, abbreviateHome } from './render.js';

/*
  The repositories one level below `dir`, in name order; [] when there are none.

  A child counts when it holds a .git entry, which is what makes a directory its
  own repository root rather than a corner of somebody else's — and a .git file
  counts as well as a .git directory, so worktrees and submodules are reported
  too. Dot entries are skipped: nothing under a dot directory is ever what a
  person meant by a path they typed. A symlink is followed rather than filtered,
  since a repository reached through one is still a repository, and there is no
  loop to fall into at one level.
*/
export function childRepos(dir)
{
    let entries;
    try
    {
        entries = readdirSync(dir, { withFileTypes: true });
    }
    catch
    {
        return []; // unreadable, or not a directory at all: nothing below to find
    }

    const out = [];
    for (const entry of entries)
    {
        if (entry.name.startsWith('.')) continue;
        const path = join(dir, entry.name);
        if (existsSync(join(path, '.git'))) out.push(path);
    }
    return out.sort();
}

export function status(args = [], io = console, { theme } = {})
{
    const dirs = (args.length > 0 ? args : ['.']).map((a) => resolve(a));
    let code = 0;

    const report = (dir) =>
    {
        const { data, error } = collectStatus(dir);
        if (error)
        {
            io.error('kit status: ' + (error.stderr.trim() || 'git status failed'));
            if (code === 0) code = error.code;
            return;
        }

        const out = renderStatus(data, { theme });
        if (out) io.log(out);
    };

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
            const children = childRepos(dir);
            if (children.length > 0)
            {
                for (const child of children) report(child);
                continue;
            }

            io.error(`kit status: ${label}: ${problem}`);
            code = 128;
            continue;
        }

        report(dir);
    }

    return code;
}
