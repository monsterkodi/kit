# Plan: `kit` — a git output wrapper

## Scope

**Stage 1 (this plan):** `status`, `add`, `commit`.
**Stage 2 (deferred):** `pull`, `diff`, `log`.

Stage 2 is deliberately deferred until stage 1 is done: once the architecture,
testing and workflow are proven, new commands are mostly renderer work.

## Decisions (settled in discussion)

- **Language:** node 26, no dependencies, no build step. Zero-install stdlib
  covers it. (~22ms startup, vs ~1.6ms for `git status`.)
- **Name / entry:** `kit`, entry point `kit.mjs`, symlinked to `~/.local/bin/kit`.
- **Location:** `~/s/k/` (already a git repo with an empty `.gitignore`).
- **Argument names:** full words, not abbreviations — `kit status`, `kit add`,
  `kit commit`. (Aliases may be short; CLI args should not be cryptic.)
- **Parsing:** git *porcelain* output only, never human prose.
- **Paging:** never page, always stream. (Stage 2 note: `log` will need a
  default `-n` cap; 35 lines were emitted for a 6-commit repo with no pager.)
- **No passthrough:** an unknown subcommand is an error. Do not fall through to
  raw `git`. (User decision: avoids a can of worms.)
- **No `--no-add`-style toggles:** `kit commit` always calls `kit add`. Rare
  cases fall back to plain `git`. Simplicity and predictability over options.
- **`kit add` uses `git add .`** (not `-A`, not bare `git add`).

### Verified git behaviours this plan relies on

- `git add` with no args stages nothing, exits 0, prints a hint. Bare `git add`
  is disqualified; `git add .` is the stage-1 choice.
- `git add .` writes empty stdout AND empty stderr even when it stages changes
  — there is no output to filter, so `kit add` renders `kit status` itself.
- `git status --porcelain=v2 -unormal` collapses untracked dirs (`? deep/`);
  `-uall` expands them. `-unormal` is the collapse-dirs behaviour the user wants.
- `git commit --porcelain` implies `--dry-run` (documented; observed exiting 0
  without committing). Never used.
- On nothing-to-commit, `git commit` exits 1 and prints the verbose
  `nothing added to commit but untracked files present` on **stdout** — render
  only that line, discard the `On branch…` preamble.
- `git diff --cached --name-status` is not needed (add delegates to status).
- `process.argv.slice(2).join(' ')` reproduces bash `$*` semantics, including
  collapsing runs of whitespace; shell quotes do not reach git.

## Layout

```
~/s/k/
  kit.mjs           dispatch: subcommand -> module, arg splitting
  lib/git.mjs       collect: run git, return plain data + exit code
  lib/theme.mjs     colour constants
  lib/render.mjs    pure renderers: data -> styled string
  lib/status.mjs    collect + render for status
  lib/add.mjs       collect + render for add
  lib/commit.mjs    collect + render for commit
  test/             fixtures; renderers tested with no git invocation
```

The **collect/render seam** is the core: `lib/git.mjs` runs git and returns data;
`render` is a pure function. Renderers are tested against captured fixture
strings, so colour/layout changes need no repo and no git call.

## Commands

### `kit status`

- **Silent when clean** (exit 0, zero bytes). Any output at all — including the
  branch line — is suppressed.
- **When dirty:** a compact branch header, then grouped sections, one line per
  file. Header design (user-approved):
  ```
    main ↓2├ staged M  src/a.mjs
  ├ unstaged    ~  src/b.mjs
  └ untracked   ?  build/
  ```
  Ahead/behind via `for-each-ref` if desired; untracked dirs collapse.

### `kit add [path…]`

- `git add .` (or `git add <path>…`), then render `kit status`.
- No own output to suppress; consistency comes free from the shared renderer.

### `kit commit [words…]`

- Calls `kit add` (its status output is intentional), then `git commit -m`.
- `kit commit fix the prompt` -> `-m "fix the prompt"` (argv joined).
- `kit commit` (or empty after join, e.g. `kc ""`) -> `-m "misc"`.
- Success: dim `[branch hash]`, bold hash, dim stat line.
- Nothing staged: exit 1, render only `nothing added to commit but untracked
  files present`.
- Fully clean tree: silent (matches status).
- Alias `kc="kit commit"` works as a real alias (node does the joining).

## Open / deferred

- `kit pull`, `kit diff`, `kit log` — stage 2.
- Whether the `kit status` header should also show behind-count and a tracking
  marker (design sketch kept simple for now).
- Whether to mirror this plan into `~/s/k/` as a version-controlled design doc
  (offered to the user; not done unless requested).

## Notes

- No `package.json` dependencies; no build step; `kit` generates no artifacts,
  so `~/s/k/.gitignore` stays empty.
- Working style for this project: plain discussion, no question-UI popups (user
  preference). Keep decisions in prose.

## User Feedback after implementation stage-1

- code looks good on first glance
- test run started by user via `npm test` completed with 0 fails and 26 tests passed
- user appreciates the clean and minimal test run output ;)
- user did a real-world test in the clean project directory:
   - `ks`
   - `ka`
   - `kc`
   - `kc hello`
  all commands above exited silently, which is the intended behaviour
   - `ka hello`
  exited with the message: `kit add: fatal: pathspec 'hello' did not match any files`
  which is also the intended behaviour
  - user then modified this file and ran `ks` -> works, with nicely colored status display
  - `kc initial user feedback for stage-1` -> works
  - user then modified a comment in one of the test files to see how multiple files are handled:
  - ks works well on the top level
  - ks from inside a subdirectory (lib or test) works, but output is identical to the toplevel one. it would be nice if the paths were relative to the pwd, like the original git output does.
  - `ka integration.test.mjs` inside the test folder -> works as intended: just the test file got staged. 
  - same path issue (not a surprise, since it goes through the same code path)
  - `kc comment changed` from the test folder -> also works as intended: top level kit.md wasn't committed
  - a second `kc` in the test folder -> Copyrightrks (noop), but produced some git output that should be pruned
  - a final `kc` -> works as intended (comitted with 'misc' as message)
- user is really happy with the result of stage-1, well done ;)

## Stage-1 fixes from user feedback

1. **No-op `kc` from a subdirectory printed git prose.** `git add .` from a
   subdirectory cannot reach outside it, so commit had nothing staged and git
   reported `nothing added to commit but untracked files present` — while the
   status tree printed a moment earlier had already listed those untracked
   files. Fixed: when nothing reached the index, kit is silent (`stagedCount()`
   check in `lib/commit.mjs`). The exit code is still git's.

2. **Paths are now relative to the working directory**, like plain
   `git status`. Root cause: `git status --porcelain=v2 -z` always reports
   paths relative to the *repository root* and ignores cwd, because `-z` turns
   off git's own relative-path handling. `-z` is kept (it is what makes
   filenames with spaces/quotes/newlines safe, and carries a rename's origin
   path as its own record), so `relativise()` in `lib/git.mjs` rewrites paths
   using `git rev-parse --show-prefix`. Verified to match `git status --short`
   from the root, `lib/`, `lib/deep/` and `test/`.

   Side effect: a rename's `← origin` suffix is dropped when paths are
   relativised, since the origin is no longer a sibling of the destination.
