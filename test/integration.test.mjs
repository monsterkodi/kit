// integration.test.mjs 
//
// tests command modules against real throwaway repositories.
//
// Each test builds a temp repo, sets an identity so commit works without
// touching the user's global git config, and asserts on real git behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { status } from '../lib/status.mjs';
import { add } from '../lib/add.mjs';
import { commit, messageFor } from '../lib/commit.mjs';
import { log } from '../lib/log.mjs';

/** Create an empty repo in a temp dir; returns its path. */
function newRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'kit-test-'));
  // Identity must come from the environment, not -c flags: this machine has
  // GIT_AUTHOR_NAME/GIT_AUTHOR_EMAIL exported, and they take precedence over
  // `git -c user.name=…`. Set both so tests do not depend on ambient config.
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'test',
    GIT_AUTHOR_EMAIL: 't@e.st',
    GIT_COMMITTER_NAME: 'test',
    GIT_COMMITTER_EMAIL: 't@e.st',
  };
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=test', ...args], {
      cwd: dir, encoding: 'utf8', env,
    });
  git('init', '-q');
  // The initial branch name is machine state, not kit's: git takes it from
  // init.defaultBranch (this machine: main), and falls back to master when that
  // is unset. So the name is read back from the repo rather than assumed, and
  // tests assert against it — otherwise every branch-name assertion here breaks
  // the day the user changes one global git setting.
  //
  // `symbolic-ref` rather than `config init.defaultBranch`: it reports the name
  // git actually used, so it does not re-derive git's precedence rules (config
  // first, then its own master fallback — GIT_DEFAULT_BRANCH does not apply
  // here, verified on git 2.55). It also works before the first commit, where
  // `rev-parse --abbrev-ref HEAD` fails on an unborn HEAD.
  const branch = git('symbolic-ref', '--short', 'HEAD').trim();
  assert.ok(branch, 'git init should leave a named branch to read back');
  return { dir, git, env, branch, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Capturing output sink. */
function sink() {
  const out = [];
  const err = [];
  return { out, err, log: (s) => out.push(s), error: (s) => err.push(s), text: () => out.join('\n') };
}

const withCwd = (dir, fn) => {
  const prev = process.cwd();
  process.chdir(dir);
  try { return fn(); } finally { process.chdir(prev); }
};

test('messageFor: joins words like the bash function did', () => {
  assert.equal(messageFor(['this', 'is', 'a', 'commit', 'message']), 'this is a commit message');
  // Interior runs inside a single argv word survive, exactly as bash "$*" does:
  // the shell splits on IFS, so extra spacing only vanishes when it arrives as
  // separate words (which the shell has already done by the time argv is built).
  assert.equal(messageFor(['fix', '   the', '  thing']), 'fix    the   thing');
  assert.equal(messageFor([]), 'misc');
  assert.equal(messageFor(['']), 'misc');
  assert.equal(messageFor(['   ']), 'misc', 'whitespace-only collapses to the default');
});

test('status: clean repo is completely silent and exits 0', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    const io = sink();
    const code = withCwd(r.dir, () => status(io));
    assert.equal(code, 0);
    assert.equal(io.text(), '', 'clean repo must print nothing at all');
  } finally { r.cleanup(); }
});

test('status: dirty repo prints branch, sections and untracked dir collapsed', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    mkdirSync(join(r.dir, 'build', 'deep'), { recursive: true });
    writeFileSync(join(r.dir, 'build', 'deep', 'x.txt'), 'x\n');

    const io = sink();
    const code = withCwd(r.dir, () => status(io));
    assert.equal(code, 0);
    // The branch header line is exactly the name git chose at init (no upstream
    // in a fresh repo, so no tracking suffix is appended). Compared as a string,
    // not a regex, so a branch name containing '.' cannot match loosely.
    assert.equal(io.text().split('\n')[0], r.branch);
    // Only unstaged and untracked are populated here, so unstaged is not last.
    assert.match(io.text(), /^├ unstaged/m);
    assert.match(io.text(), /^└ untracked/m);
    assert.match(io.text(), /\? build\//, 'untracked dir should collapse to one line');
    assert.doesNotMatch(io.text(), /build\/deep\/x\.txt/, 'nested file should not be listed');
  } finally { r.cleanup(); }
});

test('add: stages new files (the -A vs . behaviour) and reports them', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    // The file `git add -u` would silently skip.
    writeFileSync(join(r.dir, 'new.txt'), 'n\n');

    const io = sink();
    withCwd(r.dir, () => add([], io));
    const staged = r.git('diff', '--cached', '--name-only');
    assert.match(staged, /new\.txt/, 'git add . must stage a brand-new file');
    assert.match(io.text(), /A new\.txt/, 'add should report what it staged');
  } finally { r.cleanup(); }
});

test('add: explicit paths are forwarded', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    writeFileSync(join(r.dir, 'b.txt'), 'b\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'aa\n');
    writeFileSync(join(r.dir, 'b.txt'), 'bb\n');

    const io = sink();
    withCwd(r.dir, () => add(['a.txt'], io));
    const staged = r.git('diff', '--cached', '--name-only');
    assert.match(staged, /a\.txt/);
    assert.doesNotMatch(staged, /b\.txt/, 'b.txt must remain unstaged');
  } finally { r.cleanup(); }
});

test('add: clean tree stays silent', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    const io = sink();
    withCwd(r.dir, () => add([], io));
    assert.equal(io.text(), '');
  } finally { r.cleanup(); }
});

test('commit: words become the message, new files included', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    writeFileSync(join(r.dir, 'brand.txt'), 'new\n');

    const io = sink();
    const code = withCwd(r.dir, () => commit(['fix', 'the', 'prompt'], io));
    assert.equal(code, 0);
    assert.equal(r.git('log', '-1', '--pretty=%s').trim(), 'fix the prompt');
    const files = r.git('show', '--name-only', '--pretty=format:', 'HEAD');
    assert.match(files, /brand\.txt/, 'commit must include the new file, unlike git add -u');
  } finally { r.cleanup(); }
});

test('commit: no words uses the hardcoded "misc" message', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    const io = sink();
    withCwd(r.dir, () => commit([], io));
    assert.equal(r.git('log', '-1', '--pretty=%s').trim(), 'misc');
  } finally { r.cleanup(); }
});

test('status: unaffected by the committed view — still says staged, uppercase', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    r.git('add', 'a.txt');
    const io = sink();
    withCwd(r.dir, () => status(io));
    const out = io.text();
    assert.match(out, /^└ staged/m, 'kit status keeps the staged heading');
    assert.doesNotMatch(out, /committed/, 'the commit view must not leak into kit status');
    assert.match(out, /M a\.txt/, 'letters stay uppercase');
  } finally { r.cleanup(); }
});

test('add: unaffected by the committed view — still says staged, uppercase', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    const io = sink();
    withCwd(r.dir, () => add([], io));
    const out = io.text();
    assert.match(out, /^└ staged/m, 'kit add keeps the staged heading');
    assert.doesNotMatch(out, /committed/, 'the commit view must not leak into kit add');
    assert.match(out, /M a\.txt/, 'letters stay uppercase');
  } finally { r.cleanup(); }
});

test('commit: shows the state it is about to commit, labelled committed', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    writeFileSync(join(r.dir, 'brand.txt'), 'new\n');
    const io = sink();
    withCwd(r.dir, () => commit(['msg'], io));
    const out = io.text();
    assert.match(out, /committed/, 'the pre-commit status render is intentional');
    assert.doesNotMatch(out, /^├ staged/m, 'the staged heading is relabelled in the commit view');
    assert.match(out, /a brand\.txt/, 'a new file reads as lowercase a');
    assert.match(out, /m a\.txt/, 'a modification reads as lowercase m');
  } finally { r.cleanup(); }
});

test('commit: from a subdirectory, unstaged keeps uppercase letters', () => {
  // `git add .` inside kit commit stages everything reachable from the cwd.
  // Run from sub/ so the top-level change cannot be staged: it then appears
  // under unstaged with an uppercase letter, next to the lowercased letters of
  // the committed section.
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    mkdirSync(join(r.dir, 'sub'), { recursive: true });
    writeFileSync(join(r.dir, 'sub', 'keep.txt'), 'k\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');

    writeFileSync(join(r.dir, 'a.txt'), 'top-level change\n'); // unreachable from sub/
    writeFileSync(join(r.dir, 'sub', 'keep.txt'), 'changed\n'); // reachable

    const io = sink();
    withCwd(join(r.dir, 'sub'), () => commit(['msg'], io));
    const out = io.text();
    assert.match(out, /^├ committed/m, 'the reachable change is committed');
    assert.match(out, /m keep\.txt/, 'lowercase under committed');
    assert.match(out, /^└ unstaged/m, 'the unreachable change is not staged');
    assert.match(out, /M \.\.\/a\.txt/, 'uppercase under unstaged: still git status there');
  } finally { r.cleanup(); }
});

test('commit: nothing to commit exits 1 and stays silent on a clean tree', () => {
  // kit commit runs `git add .` first, which stages untracked files too, so an
  // "untracked files present" failure is no longer reachable through kit — only
  // a fully clean tree can produce a nothing-to-commit. Both the exit code and
  // the silence are asserted here; see the following test for the message path.
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');

    const io = sink();
    const code = withCwd(r.dir, () => commit(['msg'], io));
    assert.equal(code, 1);
    assert.equal(io.text(), '', 'a clean tree produces no output at all');
  } finally { r.cleanup(); }
});

test('commit: fully clean tree is silent', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    const io = sink();
    const code = withCwd(r.dir, () => commit(['msg'], io));
    assert.equal(code, 1);
    assert.equal(io.text(), '');
  } finally { r.cleanup(); }
});

test('commit: no-op from a subdirectory is silent, not git prose', () => {
  // Regression: `git add .` from a subdirectory cannot reach outside it, so
  // commit has nothing staged and git blames "untracked files present" — even
  // though the status tree printed a moment earlier already listed them.
  // Nothing happened, so kit says nothing.
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'init');
    // git cannot track an empty directory, so give sub/ a file.
    mkdirSync(join(r.dir, 'sub'), { recursive: true });
    writeFileSync(join(r.dir, 'sub', 'keep.txt'), 'k\n');
    r.git('add', '-A'); r.git('commit', '-qm', 'add sub');
    // An untracked file at the top level, invisible to `git add .` from sub/.
    writeFileSync(join(r.dir, 'scratch.tmp'), 'x\n');

    const io = sink();
    const code = withCwd(join(r.dir, 'sub'), () => commit(['noop'], io));
    assert.equal(code, 1, 'git still reports nothing to commit');
    assert.doesNotMatch(io.text(), /nothing added to commit/);
    assert.doesNotMatch(io.text(), /untracked files present/);
  } finally { r.cleanup(); }
});

test('all commands: not a git repository exits 128', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-norepo-'));
  try {
    // Each command has its own signature, so build a fresh sink per call and
    // invoke it the same way kit.mjs does.
    const cases = [
      ['status', (io) => status(io)],
      ['add', (io) => add([], io)],
      ['commit', (io) => commit(['x'], io)],
      ['log', (io) => log([], io)],
    ];
    for (const [name, invoke] of cases) {
      const io = sink();
      const code = withCwd(dir, () => invoke(io));
      assert.equal(code, 128, `${name} should exit 128 outside a repository`);
      assert.match(io.err.join('\n'), /not a git repository/, `${name} should say why`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// --- kit log -------------------------------------------------------------

/** A repo with `n` commits, oldest first, message "commit <i>". */
function repoWithCommits(n) {
  const r = newRepo();
  for (let i = 1; i <= n; i++) {
    writeFileSync(join(r.dir, `f${i}.txt`), `${i}\n`);
    r.git('add', '-A');
    r.git('commit', '-qm', `commit ${i}`);
  }
  return r;
}

test('log: empty history is silent and exits 0', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    const io = sink();
    const code = withCwd(r.dir, () => log([], io));
    assert.equal(code, 0);
    assert.equal(io.text(), '', 'a repo with no commits prints nothing');
  } finally { r.cleanup(); }
});

test('log: lists every commit, oldest first', () => {
  const r = repoWithCommits(3);
  try {
    const io = sink();
    withCwd(r.dir, () => log([], io));
    const lines = io.text().split('\n');
    assert.equal(lines.length, 3);
    assert.match(lines[0], /commit 1$/, 'oldest first');
    assert.match(lines[2], /commit 3$/, 'newest last');
  } finally { r.cleanup(); }
});

test('log: a bare number limits to that many commits', () => {
  const r = repoWithCommits(5);
  try {
    const io = sink();
    withCwd(r.dir, () => log(['2'], io));
    const lines = io.text().split('\n');
    assert.equal(lines.length, 2, 'a commit count, not a line count');
    // The count still selects the two *most recent* commits — reversing the
    // display must not turn `kit log 2` into the two oldest. git applies -n
    // before --reverse, so the limit is unaffected by the ordering.
    assert.match(lines[0], /commit 4$/, 'the older of the two most recent');
    assert.match(lines[1], /commit 5$/, 'the newest is last');
    assert.ok(!lines.some((l) => /commit [123]$/.test(l)), 'nothing older is shown');
  } finally { r.cleanup(); }
});

test('log: zero is silent', () => {
  const r = repoWithCommits(3);
  try {
    const io = sink();
    const code = withCwd(r.dir, () => log(['0'], io));
    assert.equal(code, 0);
    assert.equal(io.text(), '');
  } finally { r.cleanup(); }
});

test('log: shows a short hash and never a full 40-character one', () => {
  const r = repoWithCommits(1);
  try {
    const io = sink();
    withCwd(r.dir, () => log([], io));
    const line = io.text();
    const full = r.git('rev-parse', 'HEAD').trim();
    assert.ok(line.includes(full.slice(0, 7)), 'the short hash is present');
    assert.ok(!line.includes(full), 'the full hash is not');
  } finally { r.cleanup(); }
});

test('log: shows the author name without the email address', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A');
    execFileSync('git', ['commit', '-qm', 'authored'], {
      cwd: r.dir, encoding: 'utf8',
      env: { ...r.env, GIT_AUTHOR_NAME: 'Thorsten', GIT_COMMITTER_NAME: 'Thorsten', GIT_AUTHOR_EMAIL: 't@e.st' },
    });

    const io = sink();
    withCwd(r.dir, () => log([], io));
    const line = io.text();
    assert.match(line, /Thorsten/, 'the author name appears');
    assert.ok(!line.includes('t@e.st'), 'the email address does not');
  } finally { r.cleanup(); }
});

test('log: date is the short absolute form without seconds', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A');
    execFileSync('git', ['commit', '-qm', 'dated'], {
      cwd: r.dir, encoding: 'utf8',
      // format-local renders in the machine's timezone, so the fixture
      // carries an explicit +0000 offset and the assertion derives the
      // expected local time rather than assuming UTC.
      env: { ...r.env, GIT_AUTHOR_DATE: '2020-01-02T03:04:05 +0000' },
    });

    const io = sink();
    withCwd(r.dir, () => log([], io));
    const local = new Date('2020-01-02T03:04:05Z');
    const want = `Jan  ${local.getDate()} ${String(local.getHours()).padStart(2, '0')}:04`;
    assert.ok(io.text().includes(want), `date should read "${want}", got: ${io.text()}`);
    assert.ok(!/03:04:\d\d/.test(io.text()), 'seconds are not shown');
    assert.ok(!/2020/.test(io.text()), 'the year is not shown');
  } finally { r.cleanup(); }
});

test('log: a non-numeric argument errors instead of printing everything', () => {
  const r = repoWithCommits(3);
  try {
    const io = sink();
    const code = withCwd(r.dir, () => log(['foo'], io));
    assert.equal(code, 1);
    assert.equal(io.text(), '', 'no history is printed');
    assert.match(io.err.join('\n'), /not a commit count/);
  } finally { r.cleanup(); }
});

test('log: -l shows the commit body, which short mode hides', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A');
    writeFileSync(join(r.dir, 'msg.txt'),
      'the subject line\n\nA body paragraph that only --long shows.\n\nAnd a second one.');
    r.git('commit', '-q', '-F', 'msg.txt');

    const short = sink();
    withCwd(r.dir, () => log([], short, { width: 200 }));
    assert.match(short.text(), /the subject line/);
    assert.ok(!short.text().includes('A body paragraph'), 'short mode hides the body');

    const long = sink();
    withCwd(r.dir, () => log(['-l'], long, { width: 200 }));
    assert.match(long.text(), /A body paragraph/, '-l shows the body');
    assert.match(long.text(), /And a second one\./);
  } finally { r.cleanup(); }
});

test('log: -l and --long are equivalent', () => {
  const r = repoWithCommits(2);
  try {
    const a = sink();
    const b = sink();
    withCwd(r.dir, () => log(['-l', '2'], a, { width: 100 }));
    withCwd(r.dir, () => log(['--long', '2'], b, { width: 100 }));
    assert.equal(a.text(), b.text());
  } finally { r.cleanup(); }
});

test('log: -l with a count returns exactly that many commits', () => {
  const r = repoWithCommits(5);
  try {
    const io = sink();
    withCwd(r.dir, () => log(['-l', '2'], io, { width: 100 }));
    const hashes = io.text().match(/^[0-9a-f]{7} /gm) ?? [];
    assert.equal(hashes.length, 2, 'a commit count, not a line count');
  } finally { r.cleanup(); }
});

test('log: -l 0 is silent', () => {
  const r = repoWithCommits(3);
  try {
    const io = sink();
    const code = withCwd(r.dir, () => log(['-l', '0'], io, { width: 100 }));
    assert.equal(code, 0);
    assert.equal(io.text(), '');
  } finally { r.cleanup(); }
});

test('log: output respects the terminal width it is given', () => {
  const r = repoWithCommits(1);
  try {
    const io = sink();
    withCwd(r.dir, () => log([], io, { width: 80 }));
    const line = io.text().replace(/\u001b\[[0-9;]*m/g, '');
    assert.ok([...line].length <= 80, `line of ${[...line].length} must fit 80`);
  } finally { r.cleanup(); }
});

test('log: a subject with spaces and colons is preserved', () => {
  const r = newRepo();
  try {
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A');
    r.git('commit', '-qm', 'fix: handle empty tree and  spaces');
    const io = sink();
    withCwd(r.dir, () => log([], io));
    assert.match(io.text(), /fix: handle empty tree and {2}spaces$/);
  } finally { r.cleanup(); }
});
