/*
  theme.mjs — colour constants.

  Every value is a function of the raw string, so renderers stay pure and
  testable: no global state, no import-time side effects. Tests assert on
  rendered output with colours disabled via NO_COLOR.
*/

/*
  Respect the NO_COLOR convention (https://no-color.org) and the common
  TERM=dumb case. Kit is a private tool for one user on a terminal, so the
  common path is always coloured; these exist so tests and pipes behave.
*/
const enabled = !process.env.NO_COLOR && process.env.TERM !== 'dumb';

const wrap = (open, close) => (s) => (enabled ? `\u001b[${open}m${s}\u001b[${close}m` : String(s));
const fg = (code) => wrap(`38;5;${code}`, 39);
const bg = (code) => wrap(`48;5;${code}`, 49);

/*
  The repository root's highlight: yellow on the deep blue of the same
  256-colour ramp as the branch name it sits next to, so the two read as one
  header.

  25 rather than 39: 39 is the bright blue kit already uses for the branch, and
  yellow on bright blue has almost no contrast. The chip is also a background,
  and every other colour in the palette is a foreground — so it is deliberately
  the loudest thing kit draws. It has to be: it is the one element that must be
  found first when several repositories are reported at once.
*/
const chip = bg(25);
const onChip = fg(226);

export const theme = {
  enabled,

  // Semantic colours for repository state.
  add: fg(114), // green
  del: fg(203), // red
  mod: fg(179), // amber
  untracked: fg(245), // grey

  // Structure.
  branch: (s) => (enabled ? `\u001b[1m\u001b[38;5;39m${s}\u001b[39m\u001b[0m` : String(s)),
  // The repository root, on the branch header. The padding lives inside the
  // highlight, so its trailing space is what separates root from branch and the
  // two never touch.
  repoPath: (s) => chip(onChip(` ${s} `)),
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