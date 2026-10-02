# Stage-2 additions: terminal width and `kit log --long`

Extends `kit log` (see the main body of this file above) with two features the
user asked for after using stage 2 in the real terminal.

## What the terminal investigation actually found

The user reported that long commit messages are "truncated to a certain length",
bleeding into the next line in a small window, and cropped at half the screen in
a large one. Measured on the real screen with kitty + grim in `~/.config`
(a 61-commit repository, window 959px = 111 columns):

- **Nothing is truncated.** `kit log` emits complete subjects; the longest in
  that repository is 79 characters and renders in full. Verified by piping
  `kit log 10` and measuring line lengths (109 chars for a 29-column prefix +
  79-character subject + space).
- **kitty wraps, it does not clip.** A control test emitting a 160-character
  line showed it wrapped onto a second line with the tail intact. An earlier
  screenshot appeared to show truncation only because the image crop was
  narrower than the window.
- **The real defect is wrapping at column 0.** A subject longer than
  `columns - 29` overflows and the terminal continues it at the left margin,
  breaking the column alignment. That is the "bleeding into the next line".

So this stage is about **using the available width and never letting the
terminal wrap**, not about undoing a crop.

## Width detection

`process.stdout.columns` when stdout is a TTY; verified correct in a real
40-column pty (reported 40). Fallback **80** when not a TTY or the value is not
a positive integer — matching `tput cols` on this machine.

Note: reading it inside `$(...)` yields `undefined`, because a command
substitution pipes stdout. `kit` writes straight to the TTY, so it is available
where it matters. Width is passed into the renderer as data, so rendering stays
pure and testable.

## Fixed prefix width

    7 (hash) + 1 + 11 (date) + 1 + 8 (name) + 1 = 29 columns

Subject budget = `width - 29`.

## Feature 1 — width-aware truncation (default)

One line per commit, subject truncated to the budget and marked with a
single-glyph ellipsis `…` (user's choice over `...`; it costs one column
instead of three).

```
f9c98c7 Oct  1 04:32 opencode AGENTS.md: replace rules satisfiable by so…
b66e558 Oct  1 04:09 Thorsten recent agent rules reverted
```

**Minimum subject budget: 40 columns.** Below that, do not truncate — emit the
subject in full and let the terminal wrap. A heavily mangled message is worse
than an imperfect one, and a 40-column floor guarantees the `fix:`-style prefix
is always visible. A terminal narrower than 69 columns therefore produces
untruncated overflow rather than a stub.

## Feature 2 — `kit log -l` / `--long`

Shows the full message, wrapping instead of truncating, with continuation lines
indented to the subject column (29 spaces) so the layout stays aligned:

```
244a7a1 Oct  1 00:44 opencode Two lessons from a session that worked well at
                             first and then quietly degraded.

                             A line in this file can be satisfied by sounding
                             thoughtful instead of by doing the thing.
                             Three could.
```

Must use **`%B` (raw body), not `%s` (subject)**. Evidence: 13 of the 61
commits in `~/.config` carry a real body, including both commits visible in the
screenshot. With `%s` their bodies would be folded into one unreadable line and
`--long` would be worse than `git log`.

Paragraph breaks are preserved (a blank line between paragraphs); hard-wrapped
input lines are re-flowed to the current width, because the stored bodies were
wrapped at 80 columns and the window is a different size.

## Narrow-terminal layout (below 60 columns)

Below 60 columns the 29-column prefix leaves too little subject space, so both
modes switch to a two-line layout: hash/date/name on the first line, the
message indented by 2 on the following line(s). Set at 60 columns by the user's
decision.

```
f9c98c7 Oct  1 04:32 opencode
  AGENTS.md: replace rules satisfiable by sounding
  thoughtful with checkable ones
```

## Parsing change

`%s` never contains a newline, so the existing line-based parser works for the
default mode. `%B` **does** contain newlines, so a line-based split is unsafe.

Verified constraint: git rejects a NUL byte in a commit message ("a NUL byte in
commit log message not allowed"), but `\x1e` **survives** — so `\x1e` cannot be
a record separator.

Solution: put `%x00` at the *start* of the format. git writes a newline after
each record, so the next record's leading NUL absorbs it, and every record
begins with a NUL. Splitting on NUL is therefore unambiguous even with
multi-line bodies, and each record is exactly 5 fields
(`'', hash, date, name, body`). Confirmed with `od -c` on a three-commit repo
with multi-paragraph bodies.

## Arguments

    kit log              short, whole history
    kit log 10           short, 10 commits
    kit log -l           long, whole history
    kit log -l 10        long, 10 commits

`-l` and `--long` are equivalent. A bare number is still a commit count. A
non-numeric, non-flag argument still errors and names the argument.

## Tests

Width handling (pure, no git):
- subject within budget is untouched
- subject over budget is truncated with `…` and the result fits the width
- the 40-column floor suppresses truncation
- ellipsis costs one column
- multi-byte characters count as display columns, not bytes
- `--long` wraps at the budget with 29-column indent on continuations
- `--long` preserves blank lines between paragraphs
- narrow (<60) uses the two-line layout in both modes
- output never exceeds the given width when truncation applies

Parsing:
- `%B` bodies with embedded newlines parse into separate records
- three consecutive records with multi-paragraph bodies
- a record containing `\x1e` does not break parsing

Integration:
- `-l 2` returns exactly two commits, wrapped
- `-l` with no count returns all
- `--long` and `-l` agree
- `kit log foo` still errors
- `kit log -l 0` is silent

## Notes

- No new dependencies.
- `renderLog` gains a width parameter and a `long` flag; it remains pure.
- Ellipsis is `…` (U+2026), one column wide in a monospace terminal.

## As implemented

Added `test/layout.test.mjs` (27 tests). Changed `lib/render.mjs`,
`lib/log.mjs`, `lib/git.mjs`, `test/log.test.mjs`, `test/integration.test.mjs`.
Suite: 102 tests, all passing.

Verified in real kitty windows via grim, at three widths:

- **111 columns** — subjects fit, nothing truncated.
- **55 columns** — narrow layout: prefix on line one, message indented on line
  two, long subject truncated with `…` at the edge.
- **`-l`** — real commit bodies from `~/.config` render with paragraph breaks
  preserved, re-wrapped to the window, em-dashes intact, continuations aligned
  under the subject column.

Three things the plan did not anticipate:

1. **PREFIX_WIDTH was wrong by one.** The date is **12** columns, not 11:
   git's `%e` pads the day to two characters, so `Oct  1 04:32` is twelve
   wide. The initial constant of 29 made every line one column too long.
   Caught by a test that measures the rendered prefix rather than trusting the
   arithmetic.

2. **The record format needed both a leading and a trailing `%x00`.** The
   trailing one puts git's newline in a field of its own; the leading one makes
   field 0 empty. The result is `['', hash, date, name, message, '\n']` — but
   only for the *first* record: after the first, the newline collapses into the
   previous separator and the empty leading field disappears, so the stride is
   5 from index 1, not 6. Getting this wrong produced duplicated and then empty
   results three separate times before the field list was printed and read
   directly. Lesson: print the bytes, do not reason about the arithmetic.

3. **The minimum-width floor had to be applied to the *decision*, not the
   size.** The first version clamped the budget up to 40 and truncated to it,
   which is the opposite of the intent. The rule is now: below
   MIN_MESSAGE_WIDTH, emit the message whole and let the terminal wrap it.
   This is the only case where output exceeds the width, and it is deliberate —
   a 30-column stub is less use than a long line. Visible at widths 60–69.

The user has not yet reviewed the floor behaviour in the real terminal; it is
the one deliberate overflow and worth confirming.