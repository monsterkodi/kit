// git.mjs — the "collect" layer.
//
// Runs git and returns plain data plus the exit code. Nothing here formats
// output for humans; that is render.mjs's job. Keeping the seam sharp is what
// lets the renderers be tested without a repository.
//
// Porcelain is used everywhere, never human-readable prose, because porcelain
// is the format git guarantees to keep stable across versions and locales.

import { execFileSync, spawnSync } from 'node:child_process';

/**
 * Run git and capture everything about the invocation.
 *
 * spawnSync (not execFileSync) because we need the exit code and streams
 * separately even when git fails — a failed commit still prints a useful
 * message on stdout that the caller may want to render.
 *
 * @returns {{code:number, ok:boolean, stdout:string, stderr:string}}
 */
export function run(args, opts = {}) {
  const r = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // Never let git spawn its own pager: kit always streams (a deliberate
    // decision), and a pager inside a captured pipe would hang or inject
    // control sequences into our output.
    //
    // GIT_OPTIONAL_LOCKS is deliberately NOT set to 0 here. It makes git skip
    // the index refresh/lock, which is right for read-only commands like log
    // but wrong when a mutating `git add` is immediately followed by a status
    // read: the status then observes a stale index and reports nothing staged.
    env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' },
    ...opts,
  });

  if (r.error) {
    return { code: 1, ok: false, stdout: '', stderr: String(r.error.message) };
  }
  return {
    code: r.status ?? 1,
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

/** Run git, returning stdout. Throws on failure. Used by internal plumbing. */
export function capture(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' },
  });
}

/**
 * True when the current directory is inside a git work tree.
 * Distinguishes "not a repo" (exit 128) from "nothing to commit" (exit 1).
 */
export function inRepo() {
  return run(['rev-parse', '--is-inside-work-tree']).ok;
}

/**
 * Parse `git status --porcelain=v2 -z -b -unormal` into structured data.
 *
 * Why -z: records are NUL-terminated, so a rename's original path arrives as
 * its own field and filenames containing spaces, quotes or newlines need no
 * escaping or heuristic splitting. Verified: a rename yields
 * "2 RM … R100 <new>\0<old>\0".
 *
 * Why -unormal: collapses untracked directories ("? deep/") rather than
 * listing every file inside them (-uall), which is the verbosity we want.
 *
 * Porcelain v2 line shapes (see git-status(1)):
 *   "# branch.oid <sha>", "# branch.head <name>", "# branch.ab +N -M"
 *   "1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>"      ordinary change
 *   "2 <XY> … <X><score> <path>\0<origPath>"             rename/copy
 *   "u <XY> …"                                           unmerged
 *   "? <path>"                                           untracked
 */
export function parseStatusV2(raw) {
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
  for (let i = 0; i < fields.length; i++) {
    const rec = fields[i];
    if (!rec) continue;

    if (rec.startsWith('# branch.oid')) {
      out.oid = rec.slice('# branch.oid '.length).trim();
      continue;
    }
    if (rec.startsWith('# branch.head')) {
      const head = rec.slice('# branch.head '.length).trim();
      out.detached = head === '(detached)';
      out.branch = out.detached ? null : head;
      continue;
    }
    if (rec.startsWith('# branch.upstream')) {
      out.upstream = rec.slice('# branch.upstream '.length).trim();
      continue;
    }
    if (rec.startsWith('# branch.ab')) {
      const m = rec.slice('# branch.ab '.length).trim().match(/^\+(\d+) -(\d+)$/);
      if (m) {
        out.ahead = Number(m[1]);
        out.behind = Number(m[2]);
      }
      continue;
    }
    if (rec.startsWith('#')) continue; // any other header

    if (rec.startsWith('?')) {
      // Record is "? <path>"; the path is the rest after one space.
      // Stored as an object so renderEntry can destructure {path, code}
      // uniformly across all three groups.
      out.untracked.push({ path: rec.slice(2), code: '?' });
      continue;
    }
    if (rec.startsWith('!')) continue; // ignored: not shown, by design

    const kind = rec[0];
    const rest = rec.slice(2);

    if (kind === '1' || kind === 'u') {
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

    if (kind === '2') {
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

/** Collect repository status as structured data. */
export function collectStatus() {
  const r = run(['status', '--porcelain=v2', '-z', '-b', '-unormal']);
  if (!r.ok) return { error: r, data: null };
  return { error: null, data: parseStatusV2(r.stdout) };
}

/** Number of staged entries; used to detect a no-op commit. */
export function stagedCount() {
  const r = run(['diff', '--cached', '--name-only']);
  if (!r.ok) return 0;
  return r.stdout.split('\n').filter(Boolean).length;
}