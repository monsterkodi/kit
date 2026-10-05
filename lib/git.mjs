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

/**
 * The current directory's path relative to the repository root, as a prefix
 * ending in "/", or '' at the root. Empty outside a repository.
 */
export function showPrefix() {
  const r = run(['rev-parse', '--show-prefix']);
  if (!r.ok) return '';
  return r.stdout.trim();
}

/**
 * Rewrite repo-root-absolute paths to be relative to the current directory,
 * the way `git status` does when run from a subdirectory.
 *
 * Why this is needed: `git status --porcelain=v2 -z` always reports paths
 * relative to the repository root, ignoring cwd. Without -z git would print
 * cwd-relative paths itself, but -z is what makes filenames containing
 * spaces, quotes or newlines safe — the "2" (rename) records carry their
 * origin path as a separate NUL-terminated field. So the trade is made
 * explicit here instead of implicitly by git.
 *
 * A path outside the current directory becomes "../…", matching git.
 */
export function relativise(data, prefix) {
  if (!prefix) return data;
  const out = { ...data };
  const fix = (items) =>
    items.map((item) => {
      const rel = relativeTo(item.path, prefix);
      if (rel === item.path) return item;
      const next = { ...item, path: rel };
      // Only the destination path is displayed; the origin is noise once the
      // new path is relative.
      delete next.orig;
      return next;
    });
  out.staged = fix(data.staged);
  out.unstaged = fix(data.unstaged);
  out.untracked = fix(data.untracked);
  return out;
}

/**
 * Make a repository-root-relative path relative to `prefix` (the cwd's prefix,
 * ending in "/"). Paths inside the prefix lose it; sibling paths gain one "../"
 * per level ascended. Paths already absolute or outside the repo are returned
 * unchanged.
 */
export function relativeTo(path, prefix) {
  if (!prefix) return path;
  if (path.startsWith(prefix)) return path.slice(prefix.length);

  // Ascend one directory at a time. `acc` is the ancestor directory *without*
  // a trailing slash; `up` counts how many levels we have climbed.
  // prefix always ends in '/', so drop it first: slicing 'lib/' at its last
  // '/' would leave 'lib' rather than the directory above it.
  let acc = prefix.replace(/\/$/, ''); // 'lib/' -> 'lib'
  let up = 0;
  while (true) {
    // Already inside an ancestor? 'lib/x' from 'lib/deep/' climbs once.
    if (acc !== '' && path.startsWith(acc + '/')) {
      return '../'.repeat(up) + path.slice(acc.length + 1);
    }
    // Climb one level. Reaching the root without a match means the path is
    // not inside any ancestor, so it gets one '../' per level climbed.
    const cut = acc.lastIndexOf('/');
    acc = cut === -1 ? '' : acc.slice(0, cut);
    up++;
    if (acc === '') {
      return '../'.repeat(up) + path;
    }
  }
}

/** Collect repository status as structured data. */
export function collectStatus() {
  const r = run(['status', '--porcelain=v2', '-z', '-b', '-unormal']);
  if (!r.ok) return { error: r, data: null };
  return { error: null, data: relativise(parseStatusV2(r.stdout), showPrefix()) };
}

/** Number of staged entries; used to detect a no-op commit. */
export function stagedCount() {
  const r = run(['diff', '--cached', '--name-only']);
  if (!r.ok) return 0;
  return r.stdout.split('\n').filter(Boolean).length;
}

// --- git log -------------------------------------------------------------

/**
 * The --date value for `kit log`: "Oct  2 00:18".
 *
 * Not git's default, which is "Fri Oct 2 00:18:11 2026 +0200" — weekday, year
 * and timezone included. Seconds are dropped too: noise at a glance, and the
 * column is narrower without them. %e is space-padded by git, so every date is
 * the same width and the columns below line up.
 *
 * Relative dates (%ar) were considered and rejected: variable-width strings
 * like "1 year, 4 months ago" would break the column alignment.
 */
export const LOG_DATE = 'format-local:%b %e %H:%M';

// Fields are NUL-separated rather than space-separated, so a message
// containing spaces cannot be confused with a field boundary.
//
// The trailing %x00 is load-bearing: git writes a newline after every record,
// and it lands in its own field after the message, so the message never ends
// with one. The leading %x00 makes the very first field empty, which keeps the
// very first record the same shape as the rest.
//
// The resulting raw layout, confirmed with od -c, is:
//
//   \0 hash \0 date \0 name \0 subject \0 \n \0 hash \0 date \0 name \0 subject \0 \n ...
//
// so after dropping git's own leading NUL marker, every record is exactly
// 4 fields followed by a '\n' filler — a uniform stride of 5.
//
// NUL is the one byte git refuses to store in a commit message ("a NUL byte in
// commit log message not allowed"), which is what makes it a safe delimiter.
// Verified: \x1e (ASCII record separator) IS stored and would not be safe.
//
// %s is the subject, with newlines folded to spaces, so it never spans lines.
// %B is the raw body and DOES span lines — which is why the message is taken
// whole rather than split on newlines.
const LOG_FORMAT_SHORT = '%x00%h%x00%ad%x00%an%x00%s%x00';
const LOG_FORMAT_LONG = '%x00%h%x00%ad%x00%an%x00%B%x00';

/** hash, date, name, message, and git's newline filler. */
const LOG_STRIDE = 5;

/**
 * Parse `git log` output produced by the formats above.
 *
 * Splitting on NUL is exact because git cannot store a NUL in a message, so a
 * field boundary is always a real boundary even when the message itself spans
 * several lines.
 */
export function parseLog(raw) {
  const fields = raw.split('\0');
  const out = [];
  // Field 0 is the empty marker from the leading %x00; from index 1 the record
  // repeats every LOG_STRIDE fields: hash, date, name, message, "\n".
  for (let i = 1; i + 4 <= fields.length; i += LOG_STRIDE) {
    // Slice from i: fields[0] is the marker, so destructuring `fields`
    // directly would read the marker as the hash.
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

/**
 * True when the repository has no commits yet (an unborn HEAD).
 *
 * Needed because `git log` exits 128 with "fatal: your current branch … does
 * not have any commits yet" in that state — the same exit code as "not a git
 * repository". An empty history is a normal state, not an error, so it must be
 * distinguished before running log rather than inferred from its exit code.
 */
export function hasCommits() {
  return run(['rev-parse', '--verify', 'HEAD']).ok;
}

// Collect commit history
//   displays commits from oldest to newest
//   defaults to one line per commit
//   option long=true displays the full message
export function collectLog(count = null, { long = false } = {}) {

  if (!hasCommits()) return { error: null, data: [] };

  const args = ['log', `--format=${long ? LOG_FORMAT_LONG : LOG_FORMAT_SHORT}`, `--date=${LOG_DATE}`, `--reverse`];
  if (count !== null) args.push('-n', String(count));

  const r = run(args);
  if (!r.ok) return { error: r, data: null };
  return { error: null, data: parseLog(r.stdout) };
}
