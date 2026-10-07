/*
  render.mjs — pure data -> styled string.

  No git calls, no I/O, no global state. Every function here is a total
  function of its arguments so the layout and colour can be changed and
  tested without a repository (see test/render.test.mjs).
*/

import { theme as t } from './theme.mjs';

const CODE_LETTER = {
    M: 'M',
    A: 'A',
    D: 'D',
    R: 'R',
    C: 'C',
    T: 'T',
    U: 'U',
};

function codeColour(code)
{
    switch (code)
    {
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

/*
  Render the ahead/behind suffix, e.g. "↓2 ↑1". Empty when in sync.
*/
export function renderTracking({ ahead = 0, behind = 0 } = {})
{
    const bits = [];
    if (ahead > 0) bits.push(t.ahead(`↓${ahead}`));
    if (behind > 0) bits.push(t.behind(`↑${behind}`));
    return bits.join(' ');
}

/*
  Replace a leading home directory with "~".

  Display only: a path is compared as a whole path segment, so "/home/kodi-other"
  is not treated as living inside "/home/kodi". No home, no shortening.
*/
export function abbreviateHome(path, home)
{
    const p = String(path ?? '');
    if (!home) return p;
    const base = String(home).replace(/\/+$/, '');
    if (p === base) return '~';
    if (p.startsWith(base + '/')) return '~' + p.slice(base.length);
    return p;
}

/*
  The branch header line. Shown only when the tree is dirty — when clean, kit
  exits silently and this is never reached.

  It leads with the repository root, because the branch name alone does not
  identify anything: the same branch name is on every repository on this
  machine, and `kit status ~/a ~/s/kit` prints two of them. The root says which
  repository is being talked about; the branch says where it is.

  `home` defaults to the environment's, and can be passed explicitly so tests
  are not at the mercy of whose account they run under.
*/
export function renderBranch(data, { home = process.env.HOME } = {})
{
    const name = data.detached ? `detached@${(data.oid ?? '').slice(0, 7)}` : data.branch;
    const label = name ?? 'unknown';
    const tracking = renderTracking(data);
    const branch = tracking ? `${t.branch(label)} ${tracking}` : t.branch(label);
    if (!data.root) return branch;
    return `${t.repoPath(abbreviateHome(data.root, home))} ${branch}`;
}

/*
  One file line: gutter letter, then path.

  `lower` renders the gutter letter in lower case. It is used only inside the
  committed section of `kit commit`, where the letter describes the commit's
  own effect on the tree (a/d/m) rather than git's current status code, and
  the case distinguishes the two even when the heading is not read.
*/
export function renderEntry({ path, code, orig }, { lower = false } = {})
{
    const raw = CODE_LETTER[code] ?? code ?? '?';
    const letter = lower ? raw.toLowerCase() : raw;
    const gutter = codeColour(code)(letter);
    if (orig) return `${gutter} ${path} ${t.dim('← ' + orig)}`;
    return `${gutter} ${path}`;
}

const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

/*
  The marker in front of a group heading.

  One glyph and one space, the same for every group: the sections are a flat
  list, not a tree, so there is nothing to close and nothing is nested. An
  earlier version closed the last group with "└" and that closure carried no
  information the uniform marker loses — the groups are always staged, unstaged,
  untracked, in that order.
*/
const MARK = '●';

/*
  The status: a branch header followed by one section per non-empty
  group.

     ~/s/kit  main ↓2
    ● staged    A  src/new.mjs
    ● unstaged  M  src/a.mjs
    ● untracked ?  build/

  `committed` is set by `kit commit` for the status it renders immediately
  before committing. That snapshot is exactly the commit's contents, so the
  heading reads "committed" and the gutter letters are lowercased. The unstaged
  and untracked sections keep their wording and their upper-case letters,
  because there the letters still mean git's current status — and from a
  subdirectory, where `git add .` cannot reach, an unstaged entry is the only
  warning that a subset is being committed.
*/
export function renderStatus(data, { committed = false, ...opts } = {})
{
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

    const lines = [renderBranch(data, opts)];
    const width = Math.max(...groups.map((g) => g.head.length));

    groups.forEach((g, idx) => {
        const label = idx < groups.length - 1 ? pad(g.head, width) : g.head;
        lines.push(g.colour(`${MARK} ` + label));
        for (const item of g.items) lines.push(`  ${renderEntry(item, { lower: g.lower })}`);
    });

    return lines.join('\n');
}

/*
  Successful commit output. git prints, e.g.:
    [master e3cd348] fourth
     1 file changed, 1 insertion(+)
  Both lines are already concise, so they are kept and merely coloured.
*/
export function renderCommitSuccess(stdout)
{
    const lines = stdout.replace(/\n+$/, '').split('\n');
    const out = [];

    for (const line of lines)
    {
        const head = line.match(/^\[([^\s\]]+)(?: ([0-9a-f]{4,}))?\] (.*)$/);
        if (head)
        {
            const [, branch, hash, subject] = head;
            out.push(`${t.dim('[' + branch)}${hash ? ' ' + t.bold(hash) : ''}${t.dim(']')} ${subject}`);
            continue;
        }
        if (/^\s*Author: /.test(line)) continue;
        if (/^\s*(create|delete|rename|chmod) mode /.test(line)) continue;
        out.push(t.dim(line));
    }

    return out.join('\n');
}

/*
  Failed commit output.

  git exits 1 and prints a verbose block on stdout, e.g.
    On branch master
    Untracked files:
      (use "git add <file>..." to include in what will be committed)
        new.txt
    nothing added to commit but untracked files present (use "git add" to track)

  Only the concluding sentence is meaningful, so the preamble is dropped and
  the trailing parenthetical hint is stripped as unhelpful noise.
*/
export function renderCommitFailure(stdout)
{
    const clean = stdout.replace(/\n+$/, '');
    if (/nothing to commit, working tree clean/.test(clean)) return '';
    const m = clean.match(/^(nothing added to commit[^\n]*)/m);
    if (m) return m[1].replace(/\s*\(use "git add[^)]*\)\s*$/, '').trim();
    return clean.trim();
}

/*
  Author name column: exactly NAME_WIDTH characters, padded with spaces or
  cropped from the right. Keeps the subject column aligned across rows.
*/
export const NAME_WIDTH = 8;

export function fitName(name, width = NAME_WIDTH)
{
    const s = String(name ?? '');
    return s.length >= width ? s.slice(0, width) : s.padEnd(width);
}

/*
  The `kit log` table: one line per commit, or wrapped paragraphs under
  `kit log --long`.

    c63ebbf Oct  2 00:18 opencode third

  The message is last and passed through untouched apart from truncation or
  wrapping; only the three fixed-width columns before it are padded. `width` is
  the terminal column count; `long` switches to the wrapped full-message layout.
*/
export function renderLog(commits, opts = {})
{
    if (!commits || commits.length === 0) return ''; // empty history: silent
    const { width = DEFAULT_WIDTH, long = false } = opts;

    return commits
        .map((c) => renderCommit(c, width, long))
        .join('\n');
}


/*
  Columns taken by "hash date name " before the message begins.

  7 (short hash) + 1 + 12 (date) + 1 + 8 (name) + 1 = 30.

  The date is 12 columns, not 11: git's %e pads the day to two characters
  ("Oct  1 04:32"), so every date is the same width and the columns align.
*/
export const PREFIX_WIDTH = 7 + 1 + 12 + 1 + NAME_WIDTH + 1;

export const NARROW_WIDTH = 60;

export const MIN_MESSAGE_WIDTH = 40;

export const DEFAULT_WIDTH = 80;

const ELLIPSIS = '…';

const NARROW_INDENT = 2;

/*
  Display width of a string in terminal columns.

  Counts by code point rather than UTF-16 unit or byte, so an em-dash or any
  other multi-byte character occupies one column — which it does in a monospace
  terminal. Combining marks and zero-width characters are not special-cased;
  commit messages in practice do not rely on them.
*/
export function displayWidth(s)
{
    return [...String(s)].length;
}

/*
  Truncate to `width` columns, marking the cut with an ellipsis.

  The ellipsis occupies the last column, so the visible result is exactly
  `width` columns wide.
*/
export function truncate(s, width)
{
    const chars = [...String(s)];
    if (chars.length <= width) return String(s);
    if (width <= 1) return ELLIPSIS.slice(0, Math.max(width, 0));
    return chars.slice(0, width - 1).join('') + ELLIPSIS;
}

/*
  Wrap text to `width` columns, breaking on spaces and preserving blank lines
  between paragraphs.

  Words longer than the width are hard-split rather than allowed to overflow,
  so no line can exceed the terminal.
*/
export function wrap(text, width)
{
    const out = [];
    for (const paragraph of String(text).split('\n'))
    {
        if (paragraph.trim() === '')
        {
            out.push(''); // paragraph break, kept
            continue;
        }
        let line = '';
        for (const word of paragraph.trim().split(/\s+/))
        {
            for (const chunk of splitLong(word, Math.max(width, 1)))
            {
                if (line === '')
                {
                    line = chunk;
                }
                else if (displayWidth(line) + 1 + displayWidth(chunk) <= width)
                {
                    line += ' ' + chunk;
                }
                else
                {
                    out.push(line);
                    line = chunk;
                }
            }
        }
        if (line !== '') out.push(line);
    }
    return out;
}

function splitLong(word, width)
{
    const chars = [...word];
    if (chars.length <= width) return [word];
    const chunks = [];
    for (let i = 0; i < chars.length; i += width) chunks.push(chars.slice(i, i + width).join(''));
    return chunks;
}

function renderCommit(c, width, long)
{
    const hash = t.logHash(c.hash ?? '');
    const date = t.logDate(c.date ?? '');
    const name = t.logName(fitName(c.name));
    const prefix = `${hash} ${date} ${name} `;

    if (width < NARROW_WIDTH)
    {
        const text = long ? (c.body ?? c.subject ?? '') : firstLine(c);
        const inner = Math.max(width - NARROW_INDENT, 8);
        const indent = ' '.repeat(NARROW_INDENT);
        // The minimum-width floor is a preference, never a licence to exceed the
        // terminal: a 30-column window must not emit a 42-column line.
        const lines = long
            ? wrap(text, inner)
            : [truncate(text, Math.min(Math.max(inner, MIN_MESSAGE_WIDTH), width - NARROW_INDENT))];
        return [prefix.trimEnd(), ...lines.map((l) => indent + l)].join('\n');
    }

    const budget = Math.max(width - PREFIX_WIDTH, 1);
    const text = long ? (c.body ?? c.subject ?? '') : firstLine(c);

    if (long)
    {
        const lines = wrap(text, budget);
        const indent = ' '.repeat(PREFIX_WIDTH);
        return [prefix + lines[0], ...lines.slice(1).map((l) => (l === '' ? '' : indent + l))].join('\n');
    }

    // Short: one line, truncated to fit the remaining budget. When the budget is
    // below MIN_MESSAGE_WIDTH the message is emitted whole and the terminal wraps
    // it, because a 30-column stub is less use than a long line.
    if (budget < MIN_MESSAGE_WIDTH) return prefix + text;
    return prefix + truncate(text, budget);
}

function firstLine(c)
{
    if (c.subject !== undefined && !c.subject.includes('\n')) return c.subject;
    const s = String(c.subject ?? '');
    return s.split('\n')[0];
}