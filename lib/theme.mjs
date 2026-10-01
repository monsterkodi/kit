// theme.mjs — colour constants.
//
// Every value is a function of the raw string, so renderers stay pure and
// testable: no global state, no import-time side effects. Tests assert on
// rendered output with colours disabled via NO_COLOR.

// Respect the NO_COLOR convention (https://no-color.org) and the common
// TERM=dumb case. Kit is a private tool for one user on a terminal, so the
// common path is always coloured; these exist so tests and pipes behave.
const enabled = !process.env.NO_COLOR && process.env.TERM !== 'dumb';

const wrap = (open, close) => (s) => (enabled ? `\u001b[${open}m${s}\u001b[${close}m` : String(s));
const fg = (code) => wrap(`38;5;${code}`, 39);

export const theme = {
  enabled,

  // Semantic colours for repository state.
  add: fg(114), // green
  del: fg(203), // red
  mod: fg(179), // amber
  untracked: fg(245), // grey

  // Structure.
  branch: (s) => (enabled ? `\u001b[1m\u001b[38;5;39m${s}\u001b[39m\u001b[0m` : String(s)),
  dim: wrap(2, 22),
  bold: wrap(1, 22),

  // Section headings in the status tree.
  headStaged: fg(114),
  // `kit commit`'s pre-commit view: a confirmed action rather than pending
  // work, so a deeper green than headStaged.
  headCommitted: fg(41),
  headUnstaged: fg(179),
  headUntracked: fg(245),

  // Ahead/behind indicators.
  ahead: fg(114),
  behind: fg(203),

  // kit log columns. Reuses the status palette so the two commands read as one
  // family: grey hash (as untracked), blue date (as the branch line), green
  // author (as the committed heading).
  logHash: fg(245),
  logDate: fg(39),
  logName: fg(41),
};