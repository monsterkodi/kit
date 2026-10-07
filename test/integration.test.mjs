/*
  integration.test.mjs

  tests command modules against real throwaway repositories.

  Each test builds a temp repo, sets an identity so commit works without
  touching the user's global git config, and asserts on real git behaviour.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { status } from '../lib/status.mjs';
import { add } from '../lib/add.mjs';
import { commit, messageFor } from '../lib/commit.mjs';
import { log } from '../lib/log.mjs';
import { headerOf, headingOf } from './style.mjs';

const KIT = fileURLToPath(new URL('../kit.mjs', import.meta.url));

// Create an empty repo; returns its path. Passing a directory places the repo
// there instead of in a fresh temp dir, which is how a test gets two
// repositories as siblings of one another.
function newRepo(where)
{
    const own = where === undefined;
    const dir = own ? mkdtempSync(join(tmpdir(), 'kit-test-')) : where;
    // git needs the directory to exist before it will init in it, and spawnSync
    // reports a missing cwd as a bare ENOENT on "git" — which reads like git is
    // not installed rather than like the path is wrong.
    if (!own) mkdirSync(dir, { recursive: true });
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
    // Cleanup only removes a temp dir kit-test made for itself: a repo placed in a
    // caller's directory belongs to the caller's cleanup.
    const cleanup = own
        ? () => rmSync(dir, { recursive: true, force: true })
        : () => {};
    return { dir, git, env, branch, cleanup };
}

// Capturing output sink.
function sink()
{
    const out = [];
    const err = [];
    return { out, err, log: (s) => out.push(s), error: (s) => err.push(s), text: () => out.join('\n') };
}

const withCwd = (dir, fn) => {
    const prev = process.cwd();
    process.chdir(dir);
    try
    {
        return fn();
    }
    finally
    {
        process.chdir(prev);
    }
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
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        const io = sink();
        const code = withCwd(r.dir, () => status([], io));
        assert.equal(code, 0);
        assert.equal(io.text(), '', 'clean repo must print nothing at all');
    }
    finally
    {
        r.cleanup();
    }
});

test('status: dirty repo prints branch, sections and untracked dir collapsed', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
        mkdirSync(join(r.dir, 'build', 'deep'), { recursive: true });
        writeFileSync(join(r.dir, 'build', 'deep', 'x.txt'), 'x\n');

        const io = sink();
        const code = withCwd(r.dir, () => status([], io));
        assert.equal(code, 0);
        // The header leads with the repository root, then the branch name git chose
        // at init (a fresh repo has no upstream, so no tracking suffix is appended).
        // Matched through headerOf, so the padding and colour around it can change;
        // the root and the branch cannot.
        assert.match(io.text(), headerOf(r.dir, r.branch));
        // Only unstaged and untracked are populated here, so unstaged is not last.
        assert.match(io.text(), headingOf('unstaged'));
        assert.match(io.text(), headingOf('untracked'));
        assert.match(io.text(), /\? build\//, 'untracked dir should collapse to one line');
        assert.doesNotMatch(io.text(), /build\/deep\/x\.txt/, 'nested file should not be listed');
    }
    finally
    {
        r.cleanup();
    }
});

test('add: stages new files (the -A vs . behaviour) and reports them', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        // The file `git add -u` would silently skip.
        writeFileSync(join(r.dir, 'new.txt'), 'n\n');

        const io = sink();
        withCwd(r.dir, () => add([], io));
        const staged = r.git('diff', '--cached', '--name-only');
        assert.match(staged, /new\.txt/, 'git add . must stage a brand-new file');
        assert.match(io.text(), /A new\.txt/, 'add should report what it staged');
    }
    finally
    {
        r.cleanup();
    }
});

test('add: explicit paths are forwarded', () => {
    const r = newRepo();
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('add: clean tree stays silent', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        const io = sink();
        withCwd(r.dir, () => add([], io));
        assert.equal(io.text(), '');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: words become the message, new files included', () => {
    const r = newRepo();
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: no words uses the hardcoded "misc" message', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
        const io = sink();
        withCwd(r.dir, () => commit([], io));
        assert.equal(r.git('log', '-1', '--pretty=%s').trim(), 'misc');
    }
    finally
    {
        r.cleanup();
    }
});

test('status: unaffected by the committed view — still says staged, uppercase', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
        r.git('add', 'a.txt');
        const io = sink();
        withCwd(r.dir, () => status([], io));
        const out = io.text();
        assert.match(out, headingOf('staged'), 'kit status keeps the staged heading');
        assert.doesNotMatch(out, /committed/, 'the commit view must not leak into kit status');
        assert.match(out, /M a\.txt/, 'letters stay uppercase');
    }
    finally
    {
        r.cleanup();
    }
});

test('add: unaffected by the committed view — still says staged, uppercase', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
        const io = sink();
        withCwd(r.dir, () => add([], io));
        const out = io.text();
        assert.match(out, headingOf('staged'), 'kit add keeps the staged heading');
        assert.doesNotMatch(out, /committed/, 'the commit view must not leak into kit add');
        assert.match(out, /M a\.txt/, 'letters stay uppercase');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: shows the state it is about to commit, labelled committed', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
        writeFileSync(join(r.dir, 'brand.txt'), 'new\n');
        const io = sink();
        withCwd(r.dir, () => commit(['msg'], io));
        const out = io.text();
        assert.match(out, /committed/, 'the pre-commit status render is intentional');
        assert.doesNotMatch(out, headingOf('staged'), 'the staged heading is relabelled in the commit view');
        assert.match(out, /a brand\.txt/, 'a new file reads as lowercase a');
        assert.match(out, /m a\.txt/, 'a modification reads as lowercase m');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: from a subdirectory, unstaged keeps uppercase letters', () => {
    // `git add .` inside kit commit stages everything reachable from the cwd.
    // Run from sub/ so the top-level change cannot be staged: it then appears
    // under unstaged with an uppercase letter, next to the lowercased letters of
    // the committed section.
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        mkdirSync(join(r.dir, 'sub'), { recursive: true });
        writeFileSync(join(r.dir, 'sub', 'keep.txt'), 'k\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');

        writeFileSync(join(r.dir, 'a.txt'), 'top-level change\n'); // unreachable from sub/
        writeFileSync(join(r.dir, 'sub', 'keep.txt'), 'changed\n'); // reachable

        const io = sink();
        withCwd(join(r.dir, 'sub'), () => commit(['msg'], io));
        const out = io.text();
        assert.match(out, headingOf('committed'), 'the reachable change is committed');
        assert.match(out, /m keep\.txt/, 'lowercase under committed');
        assert.match(out, headingOf('unstaged'), 'the unreachable change is not staged');
        assert.match(out, /M \.\.\/a\.txt/, 'uppercase under unstaged: still git status there');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: nothing to commit exits 1 and stays silent on a clean tree', () => {
    // kit commit runs `git add .` first, which stages untracked files too, so an
    // "untracked files present" failure is no longer reachable through kit — only
    // a fully clean tree can produce a nothing-to-commit. Both the exit code and
    // the silence are asserted here; see the following test for the message path.
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');

        const io = sink();
        const code = withCwd(r.dir, () => commit(['msg'], io));
        assert.equal(code, 1);
        assert.equal(io.text(), '', 'a clean tree produces no output at all');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: fully clean tree is silent', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        const io = sink();
        const code = withCwd(r.dir, () => commit(['msg'], io));
        assert.equal(code, 1);
        assert.equal(io.text(), '');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: no-op from a subdirectory is silent, not git prose', () => {
    // Regression: `git add .` from a subdirectory cannot reach outside it, so
    // commit has nothing staged and git blames "untracked files present" — even
    // though the status tree printed a moment earlier already listed them.
    // Nothing happened, so kit says nothing.
    const r = newRepo();
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('all commands: not a git repository exits 128', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kit-norepo-'));
    try
    {
        // Each command has its own signature, so build a fresh sink per call and
        // invoke it the same way kit.mjs does.
        const cases = [
            ['status', (io) => status([], io)],
            ['add', (io) => add([], io)],
            ['commit', (io) => commit(['x'], io)],
            ['log', (io) => log([], io)],
        ];
        for (const [name, invoke] of cases)
        {
            const io = sink();
            const code = withCwd(dir, () => invoke(io));
            assert.equal(code, 128, `${name} should exit 128 outside a repository`);
            assert.match(io.err.join('\n'), /not a git repository/, `${name} should say why`);
        }
    }
    finally
    {
        rmSync(dir, { recursive: true, force: true });
    }
});

// --- kit status [path…] ---------------------------------------------------

// A repo with one commit and one file changed: enough for a status render to
// have something to say.
function dirtyRepo(where)
{
    const r = newRepo(where);
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A');
    r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    return r;
}

// Two dirty repos side by side in one temp parent, cleaned up together.
function twoSiblings()
{
    const parent = mkdtempSync(join(tmpdir(), 'kit-paths-'));
    return { parent, a: dirtyRepo(join(parent, 'a')), b: dirtyRepo(join(parent, 'b')) };
}

test('status: the header names the repository root, not the directory run in', () => {
    const r = dirtyRepo();
    try
    {
        mkdirSync(join(r.dir, 'sub'));
        const io = sink();
        const code = withCwd(join(r.dir, 'sub'), () => status([], io));
        assert.equal(code, 0);
        // Matched through headerOf, so this survives a restyle of the header.
        assert.match(io.text(), headerOf(r.dir, r.branch));
        // The entries, on the other hand, are relative to where kit ran.
        assert.match(io.text(), /M \.\.\/a\.txt/);
    }
    finally
    {
        r.cleanup();
    }
});

test('status: a path argument reports that repository', () => {
    const r = dirtyRepo();
    try
    {
        const io = sink();
        assert.equal(status([r.dir], io), 0);
        assert.match(io.text(), headerOf(r.dir, r.branch));
        assert.match(io.text(), /M a\.txt/);
    }
    finally
    {
        r.cleanup();
    }
});

test('status: two paths give two reports, in the order given', () => {
    const { parent, a, b } = twoSiblings();
    try
    {
        const forward = sink();
        assert.equal(status([a.dir, b.dir], forward), 0);
        assert.match(forward.text(), headerOf(a.dir, a.branch));
        assert.match(forward.text(), headerOf(b.dir, b.branch));
        assert.ok(
            forward.text().indexOf(a.dir) < forward.text().indexOf(b.dir),
            'reports follow the order of the arguments',
        );

        const reverse = sink();
        assert.equal(status([b.dir, a.dir], reverse), 0);
        assert.ok(
            reverse.text().indexOf(b.dir) < reverse.text().indexOf(a.dir),
            'and reversing the arguments reverses the output',
        );
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a path argument replaces the current directory, it is not added to it', () => {
    // `ks ~/s/kit` from ~/a is about ~/s/kit. A dirty shell directory is
    // unmentioned — that is the entire reason for passing an argument.
    const { parent, a, b } = twoSiblings();
    try
    {
        const io = sink();
        const code = withCwd(a.dir, () => status([b.dir], io));
        assert.equal(code, 0);
        assert.match(io.text(), headerOf(b.dir, b.branch));
        assert.ok(!io.text().includes(a.dir), 'the shell directory is not reported');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: relative paths resolve against the directory kit started in', () => {
    // `ks . ../config` must mean "here, and my sibling" — both relative to the
    // shell's directory. The trap this guards: if kit resolved the second path
    // against the first, or changed directory between the two, "../b" would come
    // out as a child of "." instead of its sibling.
    const { parent, a, b } = twoSiblings();
    try
    {
        const io = sink();
        const code = withCwd(a.dir, () => status(['.', '../b'], io));
        assert.equal(code, 0);
        assert.match(io.text(), headerOf(a.dir, a.branch), '. is this directory');
        assert.match(io.text(), headerOf(b.dir, b.branch), '../b is the sibling of a');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a relative path from a subdirectory climbs back out', () => {
    // One level deeper, so the sibling is two "../" up. Same rule, one more step:
    // the subdirectory a command runs in must not shorten what a path means.
    const { parent, a, b } = twoSiblings();
    try
    {
        mkdirSync(join(a.dir, 'sub'));
        const io = sink();
        const code = withCwd(join(a.dir, 'sub'), () => status(['../../b'], io));
        assert.equal(code, 0);
        assert.match(io.text(), headerOf(b.dir, b.branch));
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a clean repository in the list contributes nothing', () => {
    // Silence is per repository: what the run reports is what needs attention, so
    // a clean neighbour of a dirty one does not appear at all.
    const parent = mkdtempSync(join(tmpdir(), 'kit-paths-'));
    try
    {
        const dirty = dirtyRepo(join(parent, 'dirty'));
        const clean = newRepo(join(parent, 'clean'));
        writeFileSync(join(clean.dir, 'a.txt'), 'a\n');
        clean.git('add', '-A');
        clean.git('commit', '-qm', 'init');

        const io = sink();
        assert.equal(status([clean.dir, dirty.dir], io), 0);
        assert.match(io.text(), headerOf(dirty.dir, dirty.branch));
        assert.ok(!io.text().includes(clean.dir), 'the clean repository is not mentioned');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a path that is not a repository is named, and the rest still report', () => {
    const r = dirtyRepo();
    const stranger = mkdtempSync(join(tmpdir(), 'kit-stranger-'));
    try
    {
        const io = sink();
        const code = status([r.dir, stranger], io);
        assert.equal(code, 128, 'git exits 128 for "not a repository"');
        assert.ok(io.err.join('\n').includes(stranger), 'and says which path it was');
        assert.match(io.err.join('\n'), /not a git repository/);
        assert.match(io.text(), headerOf(r.dir, r.branch), 'one bad path does not lose the others');
    }
    finally
    {
        rmSync(stranger, { recursive: true, force: true });
        r.cleanup();
    }
});

test('status: a path that does not exist is reported as such, not as a bad repo', () => {
    const missing = join(tmpdir(), 'kit-absent-42');
    const io = sink();
    const code = status([missing], io);
    assert.equal(code, 128);
    assert.ok(io.err.join('\n').includes(missing));
    assert.match(io.err.join('\n'), /no such directory/);
    assert.doesNotMatch(io.err.join('\n'), /not a git repository/);
    assert.equal(io.text(), '', 'and nothing is reported for it');
});

test('status: a bare repository and a .git directory are not work trees', () => {
    // rev-parse --is-inside-work-tree exits 0 and prints "false" in both, so an
    // exit-code check would call them repositories and fail later with git's own
    // complaint. kit answers in its own words instead.
    const parent = mkdtempSync(join(tmpdir(), 'kit-bare-'));
    try
    {
        const bare = join(parent, 'bare.git');
        mkdirSync(bare);
        execFileSync('git', ['init', '-q', '--bare', '.'], { cwd: bare, stdio: 'pipe' });
        const repo = newRepo(join(parent, 'repo'));

        for (const path of [bare, join(repo.dir, '.git')])
        {
            const io = sink();
            assert.equal(status([path], io), 128, `${path} is not a work tree`);
            assert.match(io.err.join('\n'), /no work tree/);
            assert.equal(io.text(), '');
        }
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('add and commit: the header names the repository root too', () => {
    // One renderer, so the header cannot differ between the three commands.
    const r = dirtyRepo();
    try
    {
        const added = sink();
        withCwd(r.dir, () => add([], added));
        assert.match(added.text(), headerOf(r.dir, r.branch));

        writeFileSync(join(r.dir, 'b.txt'), 'b\n');
        const committed = sink();
        withCwd(r.dir, () => commit(['msg'], committed));
        assert.match(committed.text(), headerOf(r.dir, r.branch));
        assert.match(committed.text(), headingOf('committed'));
    }
    finally
    {
        r.cleanup();
    }
});

test('kit --help lists each subcommand with its arguments', () => {
    // The header a new command is documented by, pinned once so a rename cannot
    // leave the usage text behind.
    const out = execFileSync(process.execPath, [KIT, '--help'], { encoding: 'utf8' });
    assert.match(out, /^ {2}kit status \[path…] {2,}report the working tree/m);
    assert.match(out, /^ {2}kit add \[path…] {2,}stage changes/m);
    assert.match(out, /^ {2}kit commit \[words…] {2,}stage, then commit/m);
    assert.match(out, /^ {2}kit log \[n] {2,}one line per commit/m);
});

// --- kit log -------------------------------------------------------------

// A repo with `n` commits, oldest first, message "commit <i>".
function repoWithCommits(n)
{
    const r = newRepo();
    for (let i = 1; i <= n; i++)
    {
        writeFileSync(join(r.dir, `f${i}.txt`), `${i}\n`);
        r.git('add', '-A');
        r.git('commit', '-qm', `commit ${i}`);
    }
    return r;
}

test('log: empty history is silent and exits 0', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        const io = sink();
        const code = withCwd(r.dir, () => log([], io));
        assert.equal(code, 0);
        assert.equal(io.text(), '', 'a repo with no commits prints nothing');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: lists every commit, oldest first', () => {
    const r = repoWithCommits(3);
    try
    {
        const io = sink();
        withCwd(r.dir, () => log([], io));
        const lines = io.text().split('\n');
        assert.equal(lines.length, 3);
        assert.match(lines[0], /commit 1$/, 'oldest first');
        assert.match(lines[2], /commit 3$/, 'newest last');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: a bare number limits to that many commits', () => {
    const r = repoWithCommits(5);
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('log: zero is silent', () => {
    const r = repoWithCommits(3);
    try
    {
        const io = sink();
        const code = withCwd(r.dir, () => log(['0'], io));
        assert.equal(code, 0);
        assert.equal(io.text(), '');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: shows a short hash and never a full 40-character one', () => {
    const r = repoWithCommits(1);
    try
    {
        const io = sink();
        withCwd(r.dir, () => log([], io));
        const line = io.text();
        const full = r.git('rev-parse', 'HEAD').trim();
        assert.ok(line.includes(full.slice(0, 7)), 'the short hash is present');
        assert.ok(!line.includes(full), 'the full hash is not');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: shows the author name without the email address', () => {
    const r = newRepo();
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('log: date is the short absolute form without seconds', () => {
    const r = newRepo();
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('log: a non-numeric argument errors instead of printing everything', () => {
    const r = repoWithCommits(3);
    try
    {
        const io = sink();
        const code = withCwd(r.dir, () => log(['foo'], io));
        assert.equal(code, 1);
        assert.equal(io.text(), '', 'no history is printed');
        assert.match(io.err.join('\n'), /not a commit count/);
    }
    finally
    {
        r.cleanup();
    }
});

test('log: -l shows the commit body, which short mode hides', () => {
    const r = newRepo();
    try
    {
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
    }
    finally
    {
        r.cleanup();
    }
});

test('log: -l and --long are equivalent', () => {
    const r = repoWithCommits(2);
    try
    {
        const a = sink();
        const b = sink();
        withCwd(r.dir, () => log(['-l', '2'], a, { width: 100 }));
        withCwd(r.dir, () => log(['--long', '2'], b, { width: 100 }));
        assert.equal(a.text(), b.text());
    }
    finally
    {
        r.cleanup();
    }
});

test('log: -l with a count returns exactly that many commits', () => {
    const r = repoWithCommits(5);
    try
    {
        const io = sink();
        withCwd(r.dir, () => log(['-l', '2'], io, { width: 100 }));
        const hashes = io.text().match(/^[0-9a-f]{7} /gm) ?? [];
        assert.equal(hashes.length, 2, 'a commit count, not a line count');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: -l 0 is silent', () => {
    const r = repoWithCommits(3);
    try
    {
        const io = sink();
        const code = withCwd(r.dir, () => log(['-l', '0'], io, { width: 100 }));
        assert.equal(code, 0);
        assert.equal(io.text(), '');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: output respects the terminal width it is given', () => {
    const r = repoWithCommits(1);
    try
    {
        const io = sink();
        withCwd(r.dir, () => log([], io, { width: 80 }));
        const line = io.text().replace(/\u001b\[[0-9;]*m/g, '');
        assert.ok([...line].length <= 80, `line of ${[...line].length} must fit 80`);
    }
    finally
    {
        r.cleanup();
    }
});

test('log: a subject with spaces and colons is preserved', () => {
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A');
        r.git('commit', '-qm', 'fix: handle empty tree and  spaces');
        const io = sink();
        withCwd(r.dir, () => log([], io));
        assert.match(io.text(), /fix: handle empty tree and {2}spaces$/);
    }
    finally
    {
        r.cleanup();
    }
});
