/*
  integration.test.js

  tests command modules against real throwaway repositories.

  Each test builds a temp repo, sets an identity so commit works without
  touching the user's global git config, and asserts on real git behaviour.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { status } from '../lib/status.js';
import { add } from '../lib/add.js';
import { commit, messageFor } from '../lib/commit.js';
import { log } from '../lib/log.js';
import { headerOf, headingOf, plain, plainTheme } from './style.js';

const KIT = fileURLToPath(new URL('../kit.js', import.meta.url));

function newRepo(where)
{
    const own = where === undefined;
    const dir = own ? mkdtempSync(join(tmpdir(), 'kit-test-')) : where;
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
    const branch = git('symbolic-ref', '--short', 'HEAD').trim();
    assert.ok(branch, 'git init should leave a named branch to read back');
    const cleanup = own
        ? () => rmSync(dir, { recursive: true, force: true })
        : () => {};
    return { dir, git, env, branch, cleanup };
}

/*
  A capturing io that always hands the command a plain palette.

  Without the palette argument these commands fall back to the default palette,
  which is coloured whenever the environment has not forbidden it — and the suite
  no longer sets NO_COLOR, so the runner can stay coloured. The theme is attached
  here rather than at each of the 47 call sites, because every one of them wants
  the same thing and the ones that did not would silently start asserting on
  escape sequences.
*/
function sink()
{
    const out = [];
    const err = [];
    return {
        out,
        err,
        log: (s) => out.push(s),
        error: (s) => err.push(s),
        text: () => out.join('\n'),
        opts: { theme: plainTheme },
    };
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

/*
  A repository that has somewhere to push, plus the bare origin it pushes to.

  newRepo alone cannot exercise ahead/behind: a repository with no remote has no
  upstream to compare against, so branch.ab never arrives and kit has nothing to
  report. `other` is a second clone used to move the remote without touching
  `local`, which is the only way to make a working tree behind rather than ahead.
*/
function withRemote()
{
    const parent = mkdtempSync(join(tmpdir(), 'kit-remote-'));
    const origin = join(parent, 'origin.git');
    mkdirSync(origin);
    execFileSync('git', ['init', '-q', '--bare', '.'], { cwd: origin, stdio: 'pipe' });

    const local = newRepo(join(parent, 'local'));
    local.git('remote', 'add', 'origin', origin);
    writeFileSync(join(local.dir, 'a.txt'), 'a\n');
    local.git('add', '-A');
    local.git('commit', '-qm', 'init');
    local.git('push', '-q', '-u', 'origin', local.branch); // -u is what gives it an upstream

    const other = () =>
    {
        const dir = join(parent, 'other');
        execFileSync('git', ['clone', '-q', origin, dir], { encoding: 'utf8', env: local.env });
        return {
            dir,
            git: (...args) => execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=test', ...args],
                { cwd: dir, encoding: 'utf8', env: local.env }),
        };
    };

    return { parent, local, other };
}

test('messageFor: joins words like the bash function did', () => {
    assert.equal(messageFor(['this', 'is', 'a', 'commit', 'message']), 'this is a commit message');
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
        const code = withCwd(r.dir, () => status([], io, io.opts));
        assert.equal(code, 0);
        assert.equal(io.text(), '', 'clean repo must print nothing at all');
    }
    finally
    {
        r.cleanup();
    }
});

test('status: a clean tree in sync with its remote stays silent', () => {
    const { parent, local } = withRemote();
    try
    {
        const io = sink();
        const code = withCwd(local.dir, () => status([], io, io.opts));
        assert.equal(code, 0);
        assert.equal(io.text(), '', 'pushed and clean is nothing to say');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a clean tree ahead of its remote prints the header alone', () => {
    const { parent, local } = withRemote();
    try
    {
        writeFileSync(join(local.dir, 'b.txt'), 'b\n');
        local.git('add', '-A');
        local.git('commit', '-qm', 'unpushed');

        const io = sink();
        const code = withCwd(local.dir, () => status([], io, io.opts));
        assert.equal(code, 0, 'unpushed commits are not a failure');
        const out = plain(io.text());
        assert.equal(out.split('\n').length, 1, 'the header, and nothing after it');
        assert.match(out, headerOf(local.dir, `${local.branch} ↑1`));
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a clean tree behind its remote prints the header alone', () => {
    const { parent, local, other } = withRemote();
    try
    {
        const theirs = other();
        writeFileSync(join(theirs.dir, 'b.txt'), 'b\n');
        theirs.git('add', '-A');
        theirs.git('commit', '-qm', 'theirs');
        theirs.git('push', '-q', 'origin', local.branch);
        local.git('fetch', '-q'); // the remote-tracking ref is what status compares against

        const io = sink();
        const code = withCwd(local.dir, () => status([], io, io.opts));
        assert.equal(code, 0);
        const out = plain(io.text());
        assert.equal(out.split('\n').length, 1);
        assert.match(out, headerOf(local.dir, `${local.branch} ↓1`));
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a remote that has never been pushed to stays silent', () => {
    // A remote is configured but no upstream ref exists, so there is nothing to
    // be out of sync with. git emits branch.upstream and no branch.ab at all.
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A');
        r.git('commit', '-qm', 'init');
        r.git('remote', 'add', 'origin', join(r.dir, 'nowhere.git'));

        const io = sink();
        const code = withCwd(r.dir, () => status([], io, io.opts));
        assert.equal(code, 0);
        assert.equal(io.text(), '', 'no upstream ref means no comparison');
    }
    finally
    {
        r.cleanup();
    }
});

test('commit: nothing to commit while ahead prints the header rather than silence', () => {
    const { parent, local } = withRemote();
    try
    {
        writeFileSync(join(local.dir, 'b.txt'), 'b\n');
        local.git('add', '-A');
        local.git('commit', '-qm', 'unpushed');

        const io = sink();
        const code = withCwd(local.dir, () => commit(['msg'], io, io.opts));
        assert.equal(code, 1, 'git still has nothing to commit');
        assert.match(plain(io.text()), headerOf(local.dir, `${local.branch} ↑1`));
        assert.doesNotMatch(io.text(), /nothing added to commit/);
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
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
        const code = withCwd(r.dir, () => status([], io, io.opts));
        assert.equal(code, 0);
        assert.match(io.text(), headerOf(r.dir, r.branch));
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
        writeFileSync(join(r.dir, 'new.txt'), 'n\n');

        const io = sink();
        withCwd(r.dir, () => add([], io, io.opts));
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
        withCwd(r.dir, () => add(['a.txt'], io, io.opts));
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
        withCwd(r.dir, () => add([], io, io.opts));
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
        const code = withCwd(r.dir, () => commit(['fix', 'the', 'prompt'], io, io.opts));
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
        withCwd(r.dir, () => commit([], io, io.opts));
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
        withCwd(r.dir, () => status([], io, io.opts));
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
        withCwd(r.dir, () => add([], io, io.opts));
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
        withCwd(r.dir, () => commit(['msg'], io, io.opts));
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
        withCwd(join(r.dir, 'sub'), () => commit(['msg'], io, io.opts));
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
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');

        const io = sink();
        const code = withCwd(r.dir, () => commit(['msg'], io, io.opts));
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
        const code = withCwd(r.dir, () => commit(['msg'], io, io.opts));
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
    const r = newRepo();
    try
    {
        writeFileSync(join(r.dir, 'a.txt'), 'a\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'init');
        mkdirSync(join(r.dir, 'sub'), { recursive: true });
        writeFileSync(join(r.dir, 'sub', 'keep.txt'), 'k\n');
        r.git('add', '-A'); r.git('commit', '-qm', 'add sub');
        writeFileSync(join(r.dir, 'scratch.tmp'), 'x\n');

        const io = sink();
        const code = withCwd(join(r.dir, 'sub'), () => commit(['noop'], io, io.opts));
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
        const cases = [
            ['status', (io) => status([], io, io.opts)],
            ['add', (io) => add([], io, io.opts)],
            ['commit', (io) => commit(['x'], io, io.opts)],
            ['log', (io) => log([], io, io.opts)],
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


function dirtyRepo(where)
{
    const r = newRepo(where);
    writeFileSync(join(r.dir, 'a.txt'), 'a\n');
    r.git('add', '-A');
    r.git('commit', '-qm', 'init');
    writeFileSync(join(r.dir, 'a.txt'), 'changed\n');
    return r;
}

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
        const code = withCwd(join(r.dir, 'sub'), () => status([], io, io.opts));
        assert.equal(code, 0);
        assert.match(io.text(), headerOf(r.dir, r.branch));
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
        assert.equal(status([r.dir], io, io.opts), 0);
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
        assert.equal(status([a.dir, b.dir], forward, forward.opts), 0);
        assert.match(forward.text(), headerOf(a.dir, a.branch));
        assert.match(forward.text(), headerOf(b.dir, b.branch));
        assert.ok(
            forward.text().indexOf(a.dir) < forward.text().indexOf(b.dir),
            'reports follow the order of the arguments',
        );

        const reverse = sink();
        assert.equal(status([b.dir, a.dir], reverse, reverse.opts), 0);
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
    const { parent, a, b } = twoSiblings();
    try
    {
        const io = sink();
        const code = withCwd(a.dir, () => status([b.dir], io, io.opts));
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
    const { parent, a, b } = twoSiblings();
    try
    {
        const io = sink();
        const code = withCwd(a.dir, () => status(['.', '../b'], io, io.opts));
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
    const { parent, a, b } = twoSiblings();
    try
    {
        mkdirSync(join(a.dir, 'sub'));
        const io = sink();
        const code = withCwd(join(a.dir, 'sub'), () => status(['../../b'], io, io.opts));
        assert.equal(code, 0);
        assert.match(io.text(), headerOf(b.dir, b.branch));
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a clean repository in the list contributes nothing', () => {
    const parent = mkdtempSync(join(tmpdir(), 'kit-paths-'));
    try
    {
        const dirty = dirtyRepo(join(parent, 'dirty'));
        const clean = newRepo(join(parent, 'clean'));
        writeFileSync(join(clean.dir, 'a.txt'), 'a\n');
        clean.git('add', '-A');
        clean.git('commit', '-qm', 'init');

        const io = sink();
        assert.equal(status([clean.dir, dirty.dir], io, io.opts), 0);
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
        const code = status([r.dir, stranger], io, io.opts);
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
    const code = status([missing], io, io.opts);
    assert.equal(code, 128);
    assert.ok(io.err.join('\n').includes(missing));
    assert.match(io.err.join('\n'), /no such directory/);
    assert.doesNotMatch(io.err.join('\n'), /not a git repository/);
    assert.equal(io.text(), '', 'and nothing is reported for it');
});

test('status: a bare repository and a .git directory are not work trees', () => {
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
            assert.equal(status([path], io, io.opts), 128, `${path} is not a work tree`);
            assert.match(io.err.join('\n'), /no work tree/);
            assert.equal(io.text(), '');
        }
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

/*
  A plain directory that holds repositories rather than being one, the shape
  ~/s has: nothing to report at the top, everything to report one level down.
*/
function nest()
{
    const parent = mkdtempSync(join(tmpdir(), 'kit-nest-'));
    return { parent, a: dirtyRepo(join(parent, 'a')), b: dirtyRepo(join(parent, 'b')) };
}

test('status: a directory that is not a repository reports the ones one level down', () => {
    const { parent, a, b } = nest();
    try
    {
        const io = sink();
        assert.equal(status([parent], io, io.opts), 0);
        assert.match(io.text(), headerOf(a.dir, a.branch));
        assert.match(io.text(), headerOf(b.dir, b.branch));
        assert.ok(
            io.text().indexOf(a.dir) < io.text().indexOf(b.dir),
            'the repositories below are reported in name order',
        );
        assert.equal(io.err.length, 0, 'and the directory itself is not a problem');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: the shell directory is looked one level down too', () => {
    const { parent, a, b } = nest();
    try
    {
        const io = sink();
        assert.equal(withCwd(parent, () => status([], io, io.opts)), 0);
        assert.match(io.text(), headerOf(a.dir, a.branch));
        assert.match(io.text(), headerOf(b.dir, b.branch));
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a clean repository one level down contributes nothing', () => {
    const { parent, a } = nest();
    try
    {
        const clean = newRepo(join(parent, 'clean'));
        writeFileSync(join(clean.dir, 'a.txt'), 'a\n');
        clean.git('add', '-A');
        clean.git('commit', '-qm', 'init');

        const io = sink();
        assert.equal(status([parent], io, io.opts), 0, 'silence is not an error');
        assert.match(io.text(), headerOf(a.dir, a.branch));
        assert.ok(!io.text().includes(clean.dir), 'the clean repository is not mentioned');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a directory with no repository below it is still not a repository', () => {
    const parent = mkdtempSync(join(tmpdir(), 'kit-empty-'));
    try
    {
        const io = sink();
        assert.equal(status([parent], io, io.opts), 128);
        assert.match(io.err.join('\n'), /not a git repository/);
        assert.ok(io.err.join('\n').includes(parent), 'and it is named');
        assert.equal(io.text(), '', 'and nothing is reported');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a plain file below a directory is not a repository to report', () => {
    const { parent } = nest();
    try
    {
        writeFileSync(join(parent, 'a', 'notes.txt'), 'x\n');
        const io = sink();
        assert.equal(status([join(parent, 'a', 'notes.txt')], io, io.opts), 128);
        assert.match(io.err.join('\n'), /not a git repository/);
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: dot directories and plain directories one level down are skipped', () => {
    const { parent, a } = nest();
    try
    {
        mkdirSync(join(parent, '.cache'));
        dirtyRepo(join(parent, '.cache', 'hidden')); // a repository, but under a dot directory
        mkdirSync(join(parent, 'notes')); // a directory that is not a repository

        const io = sink();
        assert.equal(status([parent], io, io.opts), 0);
        assert.match(io.text(), headerOf(a.dir, a.branch));
        assert.ok(!io.text().includes('hidden'), 'nothing under a dot directory is reported');
        assert.ok(!io.text().includes('notes'), 'a directory that is not a repository is not reported');
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a repository reached through a symlink one level down is reported', () => {
    const { parent, a } = nest();
    try
    {
        symlinkSync(a.dir, join(parent, 'linked'), 'dir');
        const io = sink();
        assert.equal(status([parent], io, io.opts), 0);
        assert.match(io.text(), headerOf(a.dir, a.branch));
    }
    finally
    {
        rmSync(parent, { recursive: true, force: true });
    }
});

test('status: a repository that contains another repository reports only itself', () => {
    const outer = dirtyRepo();
    try
    {
        const inner = dirtyRepo(join(outer.dir, 'inner'));
        const io = sink();
        assert.equal(status([outer.dir], io, io.opts), 0);
        assert.match(io.text(), headerOf(outer.dir, outer.branch));
        assert.doesNotMatch(io.text(), headerOf(inner.dir, inner.branch));
    }
    finally
    {
        outer.cleanup();
    }
});

test('status: one bad path among repositories that are looked into still exits 128', () => {
    const { parent, a } = nest();
    const stranger = mkdtempSync(join(tmpdir(), 'kit-stranger-'));
    try
    {
        const io = sink();
        assert.equal(status([parent, stranger], io, io.opts), 128);
        assert.match(io.text(), headerOf(a.dir, a.branch));
        assert.match(io.err.join('\n'), /not a git repository/);
    }
    finally
    {
        rmSync(stranger, { recursive: true, force: true });
        rmSync(parent, { recursive: true, force: true });
    }
});

test('add and commit: the header names the repository root too', () => {
    const r = dirtyRepo();
    try
    {
        const added = sink();
        withCwd(r.dir, () => add([], added, added.opts));
        assert.match(added.text(), headerOf(r.dir, r.branch));

        writeFileSync(join(r.dir, 'b.txt'), 'b\n');
        const committed = sink();
        withCwd(r.dir, () => commit(['msg'], committed, committed.opts));
        assert.match(committed.text(), headerOf(r.dir, r.branch));
        assert.match(committed.text(), headingOf('committed'));
    }
    finally
    {
        r.cleanup();
    }
});

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
        const code = withCwd(r.dir, () => log([], io, io.opts));
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
        withCwd(r.dir, () => log([], io, io.opts));
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
        withCwd(r.dir, () => log(['2'], io, io.opts));
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
        const code = withCwd(r.dir, () => log(['0'], io, io.opts));
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
        withCwd(r.dir, () => log([], io, io.opts));
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
        withCwd(r.dir, () => log([], io, io.opts));
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
            env: { ...r.env, GIT_AUTHOR_DATE: '2020-01-02T03:04:05 +0000' },
        });

        const io = sink();
        withCwd(r.dir, () => log([], io, io.opts));
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

/*
  A run of commits written on chosen days, at chosen times so the order is not a
  coincidence of the clock. git renders the date in the local zone, so the tests
  below read the expectation back out of a Date rather than assuming one.
*/
function datedRepo()
{
    const r = newRepo();
    const dated = (msg, iso) =>
    {
        writeFileSync(join(r.dir, `${msg}.txt`), `${msg}\n`);
        r.git('add', '-A');
        execFileSync('git', ['commit', '-qm', msg], {
            cwd: r.dir, encoding: 'utf8',
            env: { ...r.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso },
        });
    };
    dated('first', '2020-05-04T09:15:00 +0000');
    dated('second', '2020-05-04T11:45:00 +0000');
    dated('third', '2020-06-07T08:30:00 +0000');
    return r;
}

/*
  The date column, between the short hash and the author: the hash is seven
  characters and one space wide.
*/
const dateOf = (line) => line.slice(8, 20);

/*
  The date as git prints it here: "%b %e %H:%M", in the local zone. The month
  is spelled out rather than derived, because %b is the locale's business.
*/
function localDate(month, iso, minutes)
{
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, ' ');
    return `${month} ${day} ${String(d.getHours()).padStart(2, '0')}:${minutes}`;
}

/*
  A date whose calendar part has been blanked, which is to say: the time kept,
  the rest spaces. Slicing the time off the date it belongs to is what keeps
  this independent of the zone the machine happens to be in.
*/
const blanked = (date) => ' '.repeat(date.length - 5) + date.slice(-5);

// The three commits datedRepo() writes, as this machine's zone spells them.
const FIRST = localDate('May', '2020-05-04T09:15:00Z', '15');
const SECOND = localDate('May', '2020-05-04T11:45:00Z', '45');
const THIRD = localDate('Jun', '2020-06-07T08:30:00Z', '30');

test('log: a date the line above already gave is blanked to spaces', () => {
    const r = datedRepo();
    try
    {
        const io = sink();
        withCwd(r.dir, () => log([], io, { ...io.opts, width: 200 }));
        const dates = io.text().split('\n').map(dateOf);

        assert.equal(dates[0], FIRST, 'the first line carries the date in full');
        assert.equal(dates[1], blanked(SECOND), 'the second is the same day, so only its time is left');
        assert.equal(dates[2], THIRD, 'a new month is written out in full');
    }
    finally
    {
        r.cleanup();
    }
});

test('log: -l writes the date on every line, blanked or not', () => {
    const r = datedRepo();
    try
    {
        const io = sink();
        withCwd(r.dir, () => log(['-l'], io, { ...io.opts, width: 200 }));
        assert.deepEqual(io.text().split('\n').map(dateOf), [FIRST, SECOND, THIRD]);
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
        const code = withCwd(r.dir, () => log(['foo'], io, io.opts));
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
        withCwd(r.dir, () => log([], short, { ...short.opts, width: 200 }));
        assert.match(short.text(), /the subject line/);
        assert.ok(!short.text().includes('A body paragraph'), 'short mode hides the body');

        const long = sink();
        withCwd(r.dir, () => log(['-l'], long, { ...long.opts, width: 200 }));
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
        withCwd(r.dir, () => log(['-l', '2'], a, { ...a.opts, width: 100 }));
        withCwd(r.dir, () => log(['--long', '2'], b, { ...b.opts, width: 100 }));
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
        withCwd(r.dir, () => log(['-l', '2'], io, { ...io.opts, width: 100 }));
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
        const code = withCwd(r.dir, () => log(['-l', '0'], io, { ...io.opts, width: 100 }));
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
        withCwd(r.dir, () => log([], io, { ...io.opts, width: 80 }));
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
        withCwd(r.dir, () => log([], io, io.opts));
        assert.match(io.text(), /fix: handle empty tree and {2}spaces$/);
    }
    finally
    {
        r.cleanup();
    }
});
