// render.mjs — pure data -> styled string.
//
// No git calls, no I/O, no global state. Every function here is a total
// function of its arguments so the layout and colour can be changed and
// tested without a repository (see test/render.test.mjs).

import { theme as t } from './theme.mjs';

// Letters shown in the left gutter, per git's porcelain v2 XY codes.
const CODE_LETTER = {
  M: 'M',
  A: 'A',
  D: 'D',
  R: 'R',
  C: 'C',
  T: 'T',
  U: 'U',
};

/** Colour for a single-character status code. */
function codeColour(code) {
  switch (code) {
    case 'A':
      return t.add;
    case 'D':
      return t.del;
    case 'R':
    case 'C':
      return t.mod;
    case 'U':
      return t.del;
    case '?':
      return t.untracked;
    default:
      return t.mod;
  }
}

/** Render the ahead/behind suffix, e.g. "↓2 ↑1". Empty when in sync. */
export function renderTracking({ ahead = 0, behind = 0 } = {}) {
  const bits = [];
  if (ahead > 0) bits.push(t.ahead(`↓${ahead}`));
  if (behind > 0) bits.push(t.behind(`↑${behind}`));
  return bits.join(' ');
}

/**
 * The branch header line. Shown only when the tree is dirty — when clean,
 * kit exits silently and this is never reached.
 */
export function renderBranch(data) {
  const name = data.detached ? `detached@${(data.oid ?? '').slice(0, 7)}` : data.branch;
  const label = name ?? 'unknown';
  const tracking = renderTracking(data);
  return tracking ? `${t.branch(label)} ${tracking}` : t.branch(label);
}

/**
 * One file line: gutter letter, then path.
 *
 * `lower` renders the gutter letter in lower case. It is used only inside the
 * committed section of `kit commit`, where the letter describes the commit's
 * own effect on the tree (a/d/m) rather than git's current status code, and
 * the case distinguishes the two even when the heading is not read.
 */
export function renderEntry({ path, code, orig }, { lower = false } = {}) {
  const raw = CODE_LETTER[code] ?? code ?? '?';
  const letter = lower ? raw.toLowerCase() : raw;
  const gutter = codeColour(code)(letter);
  // Renames and copies read better with their source path shown.
  if (orig) return `${gutter} ${path} ${t.dim('← ' + orig)}`;
  return `${gutter} ${path}`;
}

const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

/**
 * The status tree: a branch header followed by one section per non-empty
 * group, connected by ├ and closed with └.
 *
 *   main ↓2
 *   ├ staged   A  src/new.mjs
 *   ├ unstaged ~  src/a.mjs
 *   └ untracked ?  build/
 *
 * @param {object} data
 * @param {{committed?: boolean}} [opts] committed is set by `kit commit` for
 *   the status it renders immediately before committing. That snapshot is
 *   exactly the commit's contents, so the heading reads "committed" and the
 *   gutter letters are lowercased. The unstaged and untracked sections keep
 *   their wording and their upper-case letters, because there the letters
 *   still mean git's current status — and from a subdirectory, where
 *   `git add .` cannot reach, an unstaged entry is the only warning that a
 *   subset is being committed.
 */
export function renderStatus(data, { committed = false } = {}) {
  const groups = [
    {
      key: 'staged',
      head: committed ? 'committed' : 'staged',
      colour: committed ? t.headCommitted : t.headStaged,
      items: data.staged,
      lower: committed,
    },
    { key: 'unstaged', head: 'unstaged', colour: t.headUnstaged, items: data.unstaged },
    { key: 'untracked', head: 'untracked', colour: t.headUntracked, items: data.untracked },
  ].filter((g) => g.items && g.items.length > 0);

  if (groups.length === 0) return ''; // clean: caller prints nothing

  const lines = [renderBranch(data)];
  const width = Math.max(...groups.map((g) => g.head.length));

  groups.forEach((g, idx) => {
    const last = idx === groups.length - 1;
    const branch = last ? '└' : '├';
    // pad() only when a longer heading follows, so the last group carries no
    // trailing whitespace.
    const label = idx < groups.length - 1 ? pad(g.head, width) : g.head;
    lines.push(`${branch} ${g.colour(label)}`);
    for (const item of g.items) lines.push(`  ${renderEntry(item, { lower: g.lower })}`);
  });

  return lines.join('\n');
}

/**
 * Successful commit output. git prints, e.g.:
 *   [master e3cd348] fourth
 *    1 file changed, 1 insertion(+)
 * Both lines are already concise, so they are kept and merely coloured.
 */
export function renderCommitSuccess(stdout) {
  const lines = stdout.replace(/\n+$/, '').split('\n');
  const out = [];

  for (const line of lines) {
    // "[master e3cd348] subject"
    const head = line.match(/^\[([^\s\]]+)(?: ([0-9a-f]{4,}))?\] (.*)$/);
    if (head) {
      const [, branch, hash, subject] = head;
      out.push(`${t.dim('[' + branch)}${hash ? ' ' + t.bold(hash) : ''}${t.dim(']')} ${subject}`);
      continue;
    }
    // "Author: …" is always known and never interesting for a single-user repo.
    // git indents these continuation lines with a leading space, so tolerate it.
    if (/^\s*Author: /.test(line)) continue;
    // "create mode"/"delete mode" duplicate information already in the status
    // tree that kit showed immediately before committing.
    if (/^\s*(create|delete|rename|chmod) mode /.test(line)) continue;
    // The stat summary is worth keeping, quietly.
    out.push(t.dim(line));
  }

  return out.join('\n');
}

/**
 * Failed commit output.
 *
 * git exits 1 and prints a verbose block on stdout, e.g.
 *   On branch master
 *   Untracked files:
 *     (use "git add <file>..." to include in what will be committed)
 *       new.txt
 *   nothing added to commit but untracked files present (use "git add" to track)
 *
 * Only the concluding sentence is meaningful, so the preamble is dropped and
 * the trailing parenthetical hint is stripped as unhelpful noise.
 */
export function renderCommitFailure(stdout) {
  const clean = stdout.replace(/\n+$/, '');
  if (/nothing to commit, working tree clean/.test(clean)) return '';
  const m = clean.match(/^(nothing added to commit[^\n]*)/m);
  if (m) return m[1].replace(/\s*\(use "git add[^)]*\)\s*$/, '').trim();
  // Unrecognised failure: pass it through rather than swallow information.
  return clean.trim();
}