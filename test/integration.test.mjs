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

/** Create an empty repo in a temp dir; returns its path. */
function newRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'kit-test-'));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=test', ...args], {
      cwd: dir, encoding: 'utf8',
    });
  git('init', '-q');
  return { dir, git, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
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
    assert.match(io.text(), /master/);
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
    ];
    for (const [name, invoke] of cases) {
      const io = sink();
      const code = withCwd(dir, () => invoke(io));
      assert.equal(code, 128, `${name} should exit 128 outside a repository`);
      assert.match(io.err.join('\n'), /not a git repository/, `${name} should say why`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
