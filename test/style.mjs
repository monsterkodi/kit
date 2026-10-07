/*
  style.mjs — assertions that survive a restyle.

  Two parts of kit's output are decoration-heavy and therefore likely to be
  redesigned: the branch header (repository root, then branch) and the marker in
  front of each status group. A test that names a space, a pipe or a particular
  glyph breaks on every redesign of exactly those two things — and is then
  either rewritten, which costs the coverage, or deleted, which costs more.

  So the patterns here describe what the output means and leave the decoration
  open. Colour, padding and the separator are all unpinned; the content, its
  order and the fact that a marker exists are all pinned.

  This lives in one file because the rule has to be *the same* rule in every
  test: a header assertion in one file that is stricter than the one in the next
  would put the style back into the tests one file at a time.
*/

/*
  Strip SGR escape sequences.

  The suite runs with NO_COLOR set, so this is belt and braces — but anyone
  running `node --test test/` straight from a prompt has colour on, and a test
  that only passes under NO_COLOR is a test that lies half the time.
*/
export const plain = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

// Whitespace, punctuation and symbols: any padding or separator the header may
// grow. \p{S} is what lets a box-drawing marker ("─", "│") or a bullet match.
const FILLER = '[\\s\\p{P}\\p{S}]*';

// At least one of them, so a root and a branch cannot run together into a single
// token and pass as two.
const GAP = '[\\s\\p{P}\\p{S}]+';

// The path goes into the pattern literally: "/", "." and "+" are all regex
// metacharacters, and "~" would mean something unintended if passed through raw.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/*
  The header line, whole: the root, filler, a gap, then the branch.

  Matches "~/s/kit main", " ~/s/kit │ main" and "  ~/s/kit   main ↓2 ↑1" alike
  — none of those are pinned. Rejects a wrong path, a wrong branch, the two in
  the wrong order, or anything else sharing the line.
*/
export const headerOf = (root, branch) =>
    new RegExp(`^${FILLER}${escape(root)}${GAP}${escape(branch)}$`, 'mu');

/*
  A group heading: a marker, then the word. Takes a pattern rather than a word,
  so a caller can ask about one group ("staged") or about a set
  ("committed|staged").

  The marker is not named, so ●, •, "└" or "|" can each replace it without a
  test noticing. What this does pin is that a marker exists at all: \S+
  requires one, so a renderer that dropped the marker fails loudly instead of
  passing quietly.
*/
export const headingOf = (words) => new RegExp(`^\\S+ (?:${words})\\s*$`, 'm');

export const headingLines = (out) =>
    plain(out).split('\n').filter((l) => headingOf('committed|staged|unstaged|untracked').test(l));
