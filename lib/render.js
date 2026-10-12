/*
  render.js — pure data -> styled string.
*/

import { theme as defaultTheme } from './theme.js';

const CODE_LETTER = {
    M: 'M',
    A: 'A',
    D: 'D',
    R: 'R',
    C: 'C',
    T: 'T',
    U: 'U',
};

function codeColour(code, t)
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
  Render the ahead/behind suffix, e.g. "↑2 ↓1". Empty when in sync.

  Ahead points up and behind points down: the arrows say where the local commits
  sit relative to the upstream's, not which way to fix it.
*/
export function renderTracking({ ahead = 0, behind = 0 } = {}, { theme: t = defaultTheme } = {})
{
    const bits = [];
    if (ahead > 0) bits.push(t.ahead(`↑${ahead}`));
    if (behind > 0) bits.push(t.behind(`↓${behind}`));
    return bits.join(' ');
}

/*
  True when the branch has commits the upstream lacks, or the reverse.

  A branch with no upstream is never out of sync: there is nothing to compare it
  against, so a repository with no remote, or one that has never been pushed to,
  stays silent rather than inventing a comparison.
*/
export function outOfSync({ ahead = 0, behind = 0 } = {})
{
    return ahead > 0 || behind > 0;
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
  The branch header line. Reached when the tree is dirty, and also when the tree
  is clean but out of sync with the upstream — a clean branch that is waiting on
  a push or a pull has something to say.
*/
export function renderBranch(data, { home = process.env.HOME, theme: t = defaultTheme } = {})
{
    const name = data.detached ? `detached@${(data.oid ?? '').slice(0, 7)}` : data.branch;
    const label = name ?? 'unknown';
    const tracking = renderTracking(data, { theme: t });
    const branch = tracking ? `${t.branch(label)} ${tracking}` : t.branch(label);
    if (!data.root) return branch;
    return `${t.repoPath(abbreviateHome(data.root, home))} ${branch}`;
}

export function renderEntry({ path, code, orig }, { lower = false, theme: t = defaultTheme } = {})
{
    const raw = CODE_LETTER[code] ?? code ?? '?';
    const letter = lower ? raw.toLowerCase() : raw;
    const gutter = codeColour(code, t)(letter);
    if (orig) return `${gutter} ${path} ${t.dim('← ' + orig)}`;
    return `${gutter} ${path}`;
}

const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

const MARK = '●';

/*
  The status: a branch header followed by one section per non-empty group.

     ~/s/kit  main ↑2
    ● staged    A  src/new.mjs
    ● unstaged  M  src/a.mjs
    ● untracked ?  build/

  A clean tree has no sections, so it renders the header alone or nothing at all:
  a branch waiting on a push or a pull is worth a line even with nothing to
  commit, a branch in sync with nothing to push is not.
*/
export function renderStatus(data, { committed = false, ...opts } = {})
{
    const t = opts.theme ?? defaultTheme;

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

    if (groups.length === 0) return outOfSync(data) ? renderBranch(data, opts) : '';

    const lines = [renderBranch(data, opts)];
    const width = Math.max(...groups.map((g) => g.head.length));

    groups.forEach((g, idx) => {
        const label = idx < groups.length - 1 ? pad(g.head, width) : g.head;
        lines.push(g.colour(`${MARK} ` + label));
        for (const item of g.items) lines.push(`  ${renderEntry(item, { lower: g.lower, theme: t })}`);
    });

    return lines.join('\n');
}

export function renderCommitSuccess(stdout, { theme: t = defaultTheme } = {})
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

export function renderCommitFailure(stdout, { theme: t = defaultTheme } = {})
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

/*
  Split one rendered date into its month, its day and the column the time
  starts in: "Oct  1 14:00" -> { month: 'Oct', day: '1', timeStart: 7 }.

  The format is "%b %e %H:%M" and git pads the day with a leading space, so the
  calendar part is whatever precedes the last space. A string that is not a date
  at all still yields something rather than throwing: the whole thing is the
  month, and there is no time to speak of.
*/
function splitDate(date)
{
    const timeStart = date.lastIndexOf(' ') + 1;
    const calendar = date.slice(0, timeStart);
    const monthEnd = calendar.indexOf(' ');
    return {
        month: calendar.slice(0, monthEnd < 0 ? calendar.length : monthEnd),
        day: monthEnd < 0 ? '' : calendar.slice(monthEnd + 1).trim(),
        timeStart,
    };
}

/*
  Blank the part of each date that the line above it already says.

  The comparison runs over whole fields, left to right: the month goes when the
  month repeats, and the day with it when the day repeats too. A new month ends
  the run, so "Nov 9" after "Oct 9" is written out in full — sharing a day
  number is not sharing a date. The time is a value rather than a grouping, so
  it is never blanked.

  Blank is always spaces, never a shorter string: the columns do not move when
  a date is dropped, and the width kit promised stays the width it emits.

  Only `kit log` collapses. `-l` reads every commit on its own, so the dates
  stay where the reader expects to find them.
*/
export function collapseDates(commits)
{
    let previous = null;
    return commits.map((c) =>
    {
        const date = String(c.date ?? '');
        const current = splitDate(date);

        let blank = 0;
        if (previous && current.month === previous.month)
        {
            blank = current.month.length;
            if (current.day === previous.day) blank = current.timeStart;
        }

        previous = current;
        return ' '.repeat(blank) + date.slice(blank);
    });
}

export function renderLog(commits, opts = {})
{
    if (!commits || commits.length === 0) return ''; // empty history: silent
    const { width = DEFAULT_WIDTH, long = false, theme: t = defaultTheme } = opts;

    const dates = long ? commits.map((c) => String(c.date ?? '')) : collapseDates(commits);

    return commits
        .map((c, i) => renderCommit(c, width, long, t, dates[i]))
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

function renderCommit(c, width, long, t, date = c.date ?? '')
{
    const hash = t.logHash(c.hash ?? '');
    const stamp = t.logDate(date);
    const name = t.logName(fitName(c.name));
    const prefix = `${hash} ${stamp} ${name} `;

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
