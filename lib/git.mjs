/*
  git.mjs — the "collect" layer.

  Runs git and returns plain data plus the exit code. Nothing here formats
  output for humans; that is render.mjs's job. Keeping the seam sharp is what
  lets the renderers be tested without a repository.

  Porcelain is used everywhere, never human-readable prose, because porcelain
  is the format git guarantees to keep stable across versions and locales.
*/

import { execFileSync, spawnSync } from 'node:child_process';

/*
  Run git and capture everything about the invocation.
*/
export function run(args, opts = {})
{
    const r = spawnSync('git', args, {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        // GIT_OPTIONAL_LOCKS is deliberately NOT set to 0 here. It makes git skip
        // the index refresh/lock, which is right for read-only commands like log
        // but wrong when a mutating `git add` is immediately followed by a status
        // read: the status then observes a stale index and reports nothing staged.
        env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' },
        ...opts,
    });

    if (r.error)
    {
        return { code: 1, ok: false, stdout: '', stderr: String(r.error.message) };
    }
    return {
        code: r.status ?? 1,
        ok: r.status === 0,
        stdout: r.stdout ?? '',
        stderr: r.stderr ?? '',
    };
}

export function capture(args)
{
    return execFileSync('git', args, {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' },
    });
}

const at = (dir) => (dir ? { cwd: dir } : {});

export function repoProblem(dir)
{
    const r = run(['rev-parse', '--is-inside-work-tree'], at(dir));
    if (!r.ok) return 'not a git repository';
    if (r.stdout.trim() !== 'true') return 'no work tree';
    return '';
}

export function inRepo(dir)
{
    return repoProblem(dir) === '';
}

/*
  Parse `git status --porcelain=v2 -z -b -unormal` into structured data.
*/
export function parseStatusV2(raw)
{
    const out = {
        branch: null,
        upstream: null,
        ahead: 0,
        behind: 0,
        detached: false,
        staged: [],
        unstaged: [],
        untracked: [],
    };

    const fields = raw.split('\0');
    for (let i = 0; i < fields.length; i++)
    {
        const rec = fields[i];
        if (!rec) continue;

        if (rec.startsWith('# branch.oid'))
        {
            out.oid = rec.slice('# branch.oid '.length).trim();
            continue;
        }
        if (rec.startsWith('# branch.head'))
        {
            const head = rec.slice('# branch.head '.length).trim();
            out.detached = head === '(detached)';
            out.branch = out.detached ? null : head;
            continue;
        }
        if (rec.startsWith('# branch.upstream'))
        {
            out.upstream = rec.slice('# branch.upstream '.length).trim();
            continue;
        }
        if (rec.startsWith('# branch.ab'))
        {
            const m = rec.slice('# branch.ab '.length).trim().match(/^\+(\d+) -(\d+)$/);
            if (m)
            {
                out.ahead = Number(m[1]);
                out.behind = Number(m[2]);
            }
            continue;
        }
        if (rec.startsWith('#')) continue; // any other header

        if (rec.startsWith('?'))
        {
            out.untracked.push({ path: rec.slice(2), code: '?' });
            continue;
        }
        if (rec.startsWith('!')) continue; // ignored: not shown, by design

        const kind = rec[0];
        const rest = rec.slice(2);

        if (kind === '1' || kind === 'u')
        {
            const parts = rest.split(' ');
            const xy = parts[0];
            // mH mI mW hH hI then path; -z means the path is everything after
            // the seventh space, so join the remainder rather than assume index.
            const path = parts.slice(7).join(' ');
            const x = xy[0];
            const y = xy[1];
            if (x !== '.') out.staged.push({ path, code: x });
            if (y !== '.') out.unstaged.push({ path, code: y });
            continue;
        }

        if (kind === '2')
        {
            const parts = rest.split(' ');
            const xy = parts[0];
            const path = parts.slice(8).join(' ');
            const orig = fields[++i] ?? ''; // the rename/copy source path
            const x = xy[0];
            const y = xy[1];
            if (x !== '.') out.staged.push({ path, code: x, orig });
            if (y !== '.') out.unstaged.push({ path, code: y, orig });
            continue;
        }
    }

    return out;
}

/*
  The given directory's path relative to the repository root, as a prefix
  ending in "/", or '' at the root. Empty outside a repository.
*/
export function showPrefix(dir)
{
    const r = run(['rev-parse', '--show-prefix'], at(dir));
    if (!r.ok) return '';
    return r.stdout.trim();
}

/*
  The absolute path of the repository root containing `dir`, or '' when there is
  none.
*/
export function showToplevel(dir)
{
    const r = run(['rev-parse', '--show-toplevel'], at(dir));
    if (!r.ok) return '';
    return r.stdout.trim();
}

/*
  Rewrite repo-root-absolute paths to be relative to the current directory,
  the way `git status` does when run from a subdirectory.
*/
export function relativise(data, prefix)
{
    if (!prefix) return data;
    const out = { ...data };
    const fix = (items) =>
        items.map((item) => {
            const rel = relativeTo(item.path, prefix);
            if (rel === item.path) return item;
            const next = { ...item, path: rel };
            delete next.orig;
            return next;
        });
    out.staged = fix(data.staged);
    out.unstaged = fix(data.unstaged);
    out.untracked = fix(data.untracked);
    return out;
}

/*
  Make a repository-root-relative path relative to `prefix` 
*/
export function relativeTo(path, prefix)
{
    if (!prefix) return path;
    if (path.startsWith(prefix)) return path.slice(prefix.length);

    // prefix always ends in '/', so drop it first: slicing 'lib/' at its last
    // '/' would leave 'lib' rather than the directory above it.
    let acc = prefix.replace(/\/$/, ''); // 'lib/' -> 'lib'
    let up = 0;
    while (true)
    {
        if (acc !== '' && path.startsWith(acc + '/'))
        {
            return '../'.repeat(up) + path.slice(acc.length + 1);
        }
        const cut = acc.lastIndexOf('/');
        acc = cut === -1 ? '' : acc.slice(0, cut);
        up++;
        if (acc === '')
        {
            return '../'.repeat(up) + path;
        }
    }
}

export function collectStatus(dir)
{
    const r = run(['status', '--porcelain=v2', '-z', '-b', '-unormal'], at(dir));
    if (!r.ok) return { error: r, data: null };
    const data = relativise(parseStatusV2(r.stdout), showPrefix(dir));
    data.root = showToplevel(dir);
    return { error: null, data };
}

export function stagedCount()
{
    const r = run(['diff', '--cached', '--name-only']);
    if (!r.ok) return 0;
    return r.stdout.split('\n').filter(Boolean).length;
}


export const LOG_DATE = 'format-local:%b %e %H:%M';

const LOG_FORMAT_SHORT = '%x00%h%x00%ad%x00%an%x00%s%x00';
const LOG_FORMAT_LONG = '%x00%h%x00%ad%x00%an%x00%B%x00';

const LOG_STRIDE = 5;

/*
  Parse `git log` output produced by the formats above.
*/
export function parseLog(raw)
{
    const fields = raw.split('\0');
    const out = [];
    // Field 0 is the empty marker from the leading %x00; from index 1 the record
    // repeats every LOG_STRIDE fields: hash, date, name, message, "\n".
    for (let i = 1; i + 4 <= fields.length; i += LOG_STRIDE)
    {
        const [hash, date, name, message] = fields.slice(i, i + 4);
        if (!hash) continue;
        const text = String(message ?? '').replace(/\s+$/, '');
        out.push({
            hash: hash.trim(),
            date: date.trim(),
            name: name.trim(),
            subject: text,
            body: text,
        });
    }
    return out;
}

/*
  True when the repository has no commits yet (an unborn HEAD).
*/
export function hasCommits()
{
    return run(['rev-parse', '--verify', 'HEAD']).ok;
}

/*
  Collect commit history
    displays commits from oldest to newest
    defaults to one line per commit
    option long=true displays the full message
*/
export function collectLog(count = null, { long = false } = {})
{
    if (!hasCommits()) return { error: null, data: [] };

    const args = ['log', `--format=${long ? LOG_FORMAT_LONG : LOG_FORMAT_SHORT}`, `--date=${LOG_DATE}`, `--reverse`];
    if (count !== null) args.push('-n', String(count));

    const r = run(args);
    if (!r.ok) return { error: r, data: null };
    return { error: null, data: parseLog(r.stdout) };
}
