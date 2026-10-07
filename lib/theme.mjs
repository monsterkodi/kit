/*
  theme.mjs — colour constants.
*/

/*
  Respect the NO_COLOR convention (https://no-color.org) and the common
  TERM=dumb case. 
*/
const enabled = !process.env.NO_COLOR && process.env.TERM !== 'dumb';

const wrap = (open, close) => (s) => (enabled ? `\u001b[${open}m${s}\u001b[${close}m` : String(s));
const fg = (code) => wrap(`38;5;${code}`, 39);
const bg = (code) => wrap(`48;5;${code}`, 49);

const chip = bg(25);
const onChip = fg(226);

export const theme = {
    enabled,

    add: fg(114), // green
    del: fg(203), // red
    mod: fg(179), // amber
    untracked: fg(245), // grey

    branch: (s) => (enabled ? `\u001b[1m\u001b[38;5;39m${s}\u001b[39m\u001b[0m` : String(s)),
    repoPath: (s) => chip(onChip(` ${s} `)),
    dim: wrap(2, 22),
    bold: wrap(1, 22),

    headStaged: fg(114),
    headCommitted: fg(41),
    headUnstaged: fg(179),
    headUntracked: fg(245),

    ahead: fg(114),
    behind: fg(203),

    logHash: fg(245),
    logDate: fg(39),
    logName: fg(41),
};
