# Plan: Stage 2 — `kit log`

Follows stage 1 (`kit status`, `kit add`, `kit commit`), documented in
`~/s/k/kit.md`. Stage 2 adds exactly one command. `kit diff` and `kit pull`
remain deferred at the user's request — the reason will be given at stage 3.

## Goal

Condense `git log`'s six-lines-per-commit output into one line per commit:

```
c63ebbf Oct  2 00:18 opencode    third
28dacc9 Oct  2 00:18 opencode    second: fix the thing
2f2385a Oct  2 00:18 opencode    first commit
```

On this repository that is 89 lines of `git log` reduced to 15 — the saving
grows with history, because git's per-commit overhead is exactly what is being
removed.

## Format

One line per commit, fields separated by spaces:

    <short hash> <date> <author name> <subject>

| field  | git format | rendering |
| --- | --- | --- |
| short hash | `%h` | grey (256-colour 245, same as the `untracked` heading) |
| date | `%ad` with `--date=format-local:%b %e %H:%M` | blue (39, same as the `kit status` branch line) |
| author | `%an` | green (41, same as the `committed` heading) |
| subject | `%s` | passed through unchanged |

### Decisions settled in discussion

- **No seconds.** `%H:%M` not `%H:%M:%S`. Seconds are noise at a glance and the
  column is narrower without them.
- **No relative dates** (`%ar`). The user's reasoning: they are only useful
  sparingly, they require a context switch away from real dates, they complicate
  the code, and — decisively — variable-width strings like `1 year, 4 months
  ago` would break the column alignment. Absolute dates are fixed width.
- **No decoration** (`%d`, i.e. `HEAD -> master`). The user can see the current
  branch in `kit status`; decoration is not needed in the log. This also means
  `for-each-ref` is *not* required, and the whole command is one `git log` call.
- **Subject only** (`%s`), not the full message. Consistent with one line per
  commit and with "leave the message alone". Verified: `%s` collapses an embedded
  newline to a space, so a commit can never spill onto two lines.

### Column widths (decided)

- **Author name: pad or crop to exactly 8 characters.** Chosen by the user.
  Covers the common cases `opencode` and `Thorsten` (both exactly 8). Longer
  names are cropped, which is lossy but harmless for a single-user repo whose
  author name is known — cropping cannot trigger in practice here.

## Arguments

The only argument is a bare count, and it is a *commit count*, not a line count:

    kit log         # entire history, one line per commit
    kit log 10      # the 10 most recent commits

No named options. `-n` is not exposed; the number is passed straight through to
`git log -n`. This follows the stage-1 principle that flags are for git itself,
not for kit.

Verified: `git log -n 0` produces nothing, `-n 999` produces the whole history
(harmless), and `-n 2` produces exactly two commits regardless of how many lines
each would occupy.

## Implementation shape

Follows the stage-1 collect/render split — no new plumbing is needed:

```
kit.mjs          add `log` to the dispatch switch
lib/log.mjs      collect: run git, return parsed commits + exit code
lib/render.mjs   renderLog(commits): pure data -> styled string
```

`git log --format=... --date=...` is parsed by splitting each line on the first
three spaces, with the remainder as the subject. Because `%s` cannot contain a
newline, and the three fixed fields contain no spaces of their own, this split
is unambiguous.

One `git log` call, no `for-each-ref`, no pager (`GIT_PAGER=cat` is already set
in `run()`), and streaming output as agreed in stage 1.

## Exit codes and edge cases

- Not a git repository → exit 128, message on stderr, matching the other three
  commands.
- Empty history (no commits yet) → silent, exit 0. Consistent with `kit status`
  on a clean tree.
- Non-numeric argument → an error naming the argument, not a silent fallback.
- `kit log 0` → silent, exit 0.

## Tests

Renderer tests, no git:
- one line per commit, fields in order
- empty list renders nothing
- colour tokens applied per field (checked with colours on)
- a subject containing colons, spaces, or unicode passes through intact

Integration tests, real throwaway repos:
- `kit log` on a repo with no commits is silent
- `kit log` lists every commit
- `kit log 2` lists exactly two
- `kit log 0` is silent
- the author name and short hash appear, and no full 40-char hash does
- not a repository → 128

## Notes

- `kit.md` keeps its feedback log; this is a separate file by request.
- No dependencies, no build step, same as stage 1.

## As implemented (stage 2 shipped)

Files added: `lib/log.mjs`, `test/log.test.mjs`. Changed: `kit.mjs` (dispatch +
usage), `lib/git.mjs` (`LOG_DATE`, `LOG_FORMAT`, `parseLog`, `hasCommits`,
`collectLog`), `lib/render.mjs` (`NAME_WIDTH`, `fitName`, `renderLog`),
`lib/theme.mjs` (`logHash`, `logDate`, `logName`), `test/integration.test.mjs`.

Two things the plan did not anticipate, found while building:

1. **git writes `\0\n` between log records**, not just `\0`. The first
   implementation split on NUL only and every hash after the first came back as
   `"\n3421d42"`. Adding a second `%x00` fixed the shift but produced a
   5-field stride. The robust fix — adopted — is to split records on the line
   break and fields on NUL, so the parser does not depend on how many
   separators git emits. Guarded by a test asserting no newline leaks into any
   field.

2. **`git log` exits 128 on an empty history** ("your current branch … does not
   have any commits yet") — the same code as "not a repository". An empty
   history is a normal state, so `hasCommits()` (`git rev-parse --verify HEAD`)
   is checked first and an unborn HEAD returns an empty list rather than an
   error. Without this, `kit log` in a fresh repo printed a fatal message.

Test-environment note: this machine exports `GIT_AUTHOR_NAME` and
`GIT_AUTHOR_EMAIL`, which take precedence over `git -c user.name=…`. Tests
therefore set the identity through the environment, not `-c` flags, and derive
expected local times rather than assuming UTC (`format-local:` renders in local
time).

Result: `git log -n6` is 35 lines; `kit log 6` is 6.

## User feedback for Stage-2

1. amazing! you nailed it.

