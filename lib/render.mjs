/*
  render.mjs — pure data -> styled string.
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

export function renderEntry({ path, code, orig }, { lower = false } = {})
{
    const raw = CODE_LETTER[code] ?? code ?? '?';
    const letter = lower ? raw.toLowerCase() : raw;
    const gutter = codeColour(code)(letter);
    if (orig) return `${gutter} ${path} ${t.dim('← ' + orig)}`;
    return `${gutter} ${path}`;
}

const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

const MARK = '●';

/*
  The status: a branch header followed by one section per non-empty group.

     ~/s/kit  main ↓2
    ● staged    A  src/new.mjs
    ● unstaged  M  src/a.mjs
    ● untracked ?  build/
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

export function renderCommitFailure(stdout)
{
    const clean = stdout.replace(/\n+$/, '');
    if (/nothing to commit, working tree clean/.test(clean)) return '';
    const m = clean.match(/^(nothing added to commit[^\n]*)/m);
    if (m) return m[1].replace(/\s*\(use "git add[^)]*\)\s*$/, '').trim();
    return clean.trim();
}

export const NAME_WIDTH = 8;

export function fitName(name, width = NAME_WIDTH)
{
    const s = String(name ?? '');
    return s.length >= width ? s.slice(0, width) : s.padEnd(width);
}

export function renderLog(commits, opts = {})
{
    if (!commits || commits.length === 0) return ''; // empty history: silent
    const { width = DEFAULT_WIDTH, long = false } = opts;

    return commits
        .map((c) => renderCommit(c, width, long))
        .join('\n');
}

export const PREFIX_WIDTH = 7 + 1 + 12 + 1 + NAME_WIDTH + 1;
export const NARROW_WIDTH = 60;
export const MIN_MESSAGE_WIDTH = 40;
export const DEFAULT_WIDTH = 80;

const ELLIPSIS = '…';

const NARROW_INDENT = 2;

/*
  Display width of a string in terminal columns.
*/
export function displayWidth(s)
{
    return [...String(s)].length;
}

/*
  Truncate to `width` columns, marking the cut with an ellipsis.
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
