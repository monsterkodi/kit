/*
  render.test.mjs — unit tests for the pure renderers.

  No git, no repository, no child processes: these assert layout and colour
  decisions directly. Run with NO_COLOR=1 so assertions stay readable.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusV2 } from '../lib/git.mjs';
import {
    renderStatus, renderBranch, renderCommitSuccess, renderCommitFailure, renderTracking,
    abbreviateHome, displayWidth,
} from '../lib/render.mjs';

const NUL = '\0';

test('parseStatusV2: headers, staged/unstaged split', () => {
    const raw = [
        '# branch.oid abc123def456',
        '# branch.head main',
        '# branch.upstream origin/main',
        '# branch.ab +2 -1',
        '1 M. N... 100644 100644 100644 aaa bbb src/a.mjs',
        '1 .M N... 100644 100644 100644 aaa ccc src/b.mjs',
        '? build/',
    ].join(NUL) + NUL;

    const d = parseStatusV2(raw);
    assert.equal(d.branch, 'main');
    assert.equal(d.upstream, 'origin/main');
    assert.equal(d.ahead, 2);
    assert.equal(d.behind, 1);
    assert.deepEqual(d.staged, [{ path: 'src/a.mjs', code: 'M' }]);
    assert.deepEqual(d.unstaged, [{ path: 'src/b.mjs', code: 'M' }]);
    // Untracked entries are objects like the other groups, so the renderer can
    // destructure {path, code} uniformly.
    assert.deepEqual(d.untracked, [{ path: 'build/', code: '?' }]);
});

test('parseStatusV2: rename consumes the origin path record', () => {
    // Verified real shape: "2 RM … R100 <new>\0<old>\0"
    const raw = [
        '2 RM N... 100644 100644 100644 aaa bbb R100 renamed.txt',
        'a b.txt',
    ].join(NUL) + NUL;
    const d = parseStatusV2(raw);
    assert.equal(d.staged.length, 1);
    assert.equal(d.staged[0].path, 'renamed.txt');
    assert.equal(d.staged[0].orig, 'a b.txt');
});

test('parseStatusV2: filename with a space is one path', () => {
    const raw = ['1 A. N... 100644 100644 100644 a b my file.txt'].join(NUL) + NUL;
    const d = parseStatusV2(raw);
    assert.equal(d.staged[0].path, 'my file.txt');
});

/*
  Style-tolerant assertions live in ./style.mjs: the branch header and the group
  markers are the two parts of kit's output that get restyled, so the tests
  below pin what they mean and leave how they look open.
*/
import { plain, headerOf, headingOf, headingLines } from './style.mjs';

test('renderStatus: clean tree renders nothing', () => {
    const d = { branch: 'main', staged: [], unstaged: [], untracked: [] };
    assert.equal(renderStatus(d), '');
});

test('renderStatus: dirty tree has branch header and all three sections', () => {
    const d = {
        branch: 'main', ahead: 2, behind: 0, detached: false,
        staged: [{ path: 'src/new.mjs', code: 'A' }],
        unstaged: [{ path: 'src/a.mjs', code: 'M' }],
        untracked: [{ path: 'build/' }],
    };
    const out = renderStatus(d);
    assert.match(out, /main ↓2/);
    assert.match(out, headingOf('staged'));
    assert.match(out, headingOf('unstaged'));
    assert.match(out, headingOf('untracked'));
    assert.match(out, /A src\/new\.mjs/);
    assert.match(out, /M src\/a\.mjs/);
    assert.match(out, /\? build\//);
});

test('renderStatus: empty sections are omitted and the last group closes the list', () => {
    const d = {
        branch: 'main', staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
    };
    const heads = headingLines(renderStatus(d));
    // "staged" alone would also match "unstaged", so ask about the heading lines.
    assert.doesNotMatch(heads.join('\n'), headingOf('staged'), 'an empty group is not rendered');
    assert.equal(heads.length, 1, 'only the one non-empty group renders');
    assert.match(heads[0], headingOf('unstaged'), 'the only group is also the last');
});

test('renderBranch: detached head shows short oid', () => {
    const out = renderBranch({ detached: true, oid: 'abcdef1234567890' });
    assert.match(out, /detached@abcdef1/);
});

/*
  The branch header: which repository, then which branch.

  Every assertion here goes through headerOf, so none of them can tell a leading
  space from three, a pipe from a space, or one colour from another. What they
  pin is the content and the order — and that is deliberate, because the header
  is the part of kit's output most likely to be restyled.
*/
test('renderStatus: the header names the repository root, then the branch', () => {
    const d = {
        root: '/home/kodi/s/kit', branch: 'main',
        staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
    };
    assert.match(renderStatus(d, { home: '/home/kodi' }), headerOf('~/s/kit', 'main'));
});

test('renderStatus: the root identifies the repository, not the directory kit ran in', () => {
    // Run from a subdirectory: the header names the repository the user is in, and
    // the entries below stay relative to where the command actually ran.
    const d = {
        root: '/home/kodi/a', branch: 'master',
        staged: [], unstaged: [{ path: '../top.txt', code: 'M' }], untracked: [],
    };
    assert.match(renderStatus(d, { home: '/home/kodi' }), headerOf('~/a', 'master'));
});

test('renderStatus: ahead and behind stay legible after the root', () => {
    const d = {
        root: '/home/kodi/s/kit', branch: 'main', ahead: 2, behind: 1,
        staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
    };
    const header = plain(renderStatus(d, { home: '/home/kodi' })).split('\n')[0];
    assert.match(header, headerOf('~/s/kit', 'main ↓2 ↑1'));
});

test('renderStatus: a detached head keeps its short oid beside the root', () => {
    const d = {
        root: '/home/kodi/s/kit', detached: true, oid: 'abcdef1234567890',
        staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
    };
    assert.match(renderStatus(d, { home: '/home/kodi' }), headerOf('~/s/kit', 'detached@abcdef1'));
});

test('renderStatus: a root outside home is shown in full', () => {
    const d = {
        root: '/tmp/kit-test-1', branch: 'main',
        staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
    };
    assert.match(renderStatus(d, { home: '/home/kodi' }), headerOf('/tmp/kit-test-1', 'main'));
});

test('renderStatus: a root that merely starts with home is not shortened', () => {
    // /home/kodi-other must not become ~-other.
    const d = {
        root: '/home/kodi-other', branch: 'main',
        staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
    };
    assert.match(renderStatus(d, { home: '/home/kodi' }), headerOf('/home/kodi-other', 'main'));
});

test('renderStatus: without a root the header is the branch alone', () => {
    // A partial header beats a wrong one, so nothing is invented when there is no
    // root to show.
    const d = { branch: 'main', staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [] };
    assert.equal(plain(renderStatus(d, { home: '/home/kodi' })).split('\n')[0], 'main');
});

test('abbreviateHome: a path under home loses the prefix', () => {
    assert.equal(abbreviateHome('/home/kodi/s/kit', '/home/kodi'), '~/s/kit');
    assert.equal(abbreviateHome('/home/kodi', '/home/kodi'), '~');
});

test('abbreviateHome: everything else is left exactly as it is', () => {
    assert.equal(abbreviateHome('/tmp/x', '/home/kodi'), '/tmp/x');
    assert.equal(abbreviateHome('/home/kodi-other', '/home/kodi'), '/home/kodi-other');
    assert.equal(abbreviateHome('~/s/kit', '/home/kodi'), '~/s/kit');
    assert.equal(abbreviateHome('/home/kodi/s/kit', '/home/kodi/'), '~/s/kit', 'a trailing slash on home');
});

test('abbreviateHome: with no home to compare against, the path stands', () => {
    assert.equal(abbreviateHome('/home/kodi/s/kit', undefined), '/home/kodi/s/kit');
    assert.equal(abbreviateHome('/home/kodi/s/kit', ''), '/home/kodi/s/kit');
});

test('renderTracking: in-sync renders empty', () => {
    assert.equal(renderTracking({ ahead: 0, behind: 0 }), '');
    assert.match(renderTracking({ ahead: 3, behind: 1 }), /↓3 ↑1/);
});

/*
  committed view (kit commit's pre-commit status)

  `kit commit` renders the state it is about to commit. That snapshot is
  exactly the commit's contents, so the heading says "committed" rather than
  "staged", and the status letters are lowercased so the meaning survives
  skipping the heading. Uppercase is kept everywhere else.
*/

// A tree with entries in all three groups, for the committed-view tests.
const mixedTree = () => ({
    branch: 'main', ahead: 0, behind: 0, detached: false,
    staged: [{ path: 'lib/add.mjs', code: 'A' }, { path: 'README.md', code: 'M' }],
    unstaged: [{ path: '../kit.md', code: 'M' }],
    untracked: [{ path: 'notes.tmp', code: '?' }],
});

test('renderStatus: committed view renames the staged heading', () => {
    const out = renderStatus(mixedTree(), { committed: true });
    assert.match(out, headingOf('committed'), 'staged heading becomes committed');
    assert.doesNotMatch(out, headingOf('staged'), 'staged heading is gone');
    assert.match(out, headingOf('unstaged'), 'unstaged is untouched');
    assert.match(out, headingOf('untracked'), 'untracked is untouched');
});

test('renderStatus: default view still says staged', () => {
    const out = renderStatus(mixedTree());
    assert.match(out, headingOf('staged'));
    assert.doesNotMatch(out, /committed/);
});

test('renderStatus: committed view lowercases letters in that section only', () => {
    const out = renderStatus(mixedTree(), { committed: true });
    // Inside the committed block: lowercase.
    assert.match(out, /a lib\/add\.mjs/);
    assert.match(out, /m README\.md/);
    // Unstaged keeps uppercase, because there it still means git status.
    assert.match(out, /M \.\.\/kit\.md/);
});

test('renderStatus: deletion letter is lowercased in the committed view', () => {
    const d = {
        branch: 'main', staged: [{ path: 'old.sh', code: 'D' }],
        unstaged: [], untracked: [],
    };
    assert.match(renderStatus(d, { committed: true }), /d old\.sh/);
});

test('renderStatus: committed view keeps untracked question mark', () => {
    const out = renderStatus(mixedTree(), { committed: true });
    assert.match(out, /\? notes\.tmp/, 'the ? marker is unchanged');
});

test('renderStatus: a file in both committed and unstaged renders in both', () => {
    // Not a bug: a file staged, then modified again, is in the commit *and*
    // still has loose changes in the tree.
    const d = {
        branch: 'main',
        staged: [{ path: 'a.mjs', code: 'M' }],
        unstaged: [{ path: 'a.mjs', code: 'M' }],
        untracked: [],
    };
    const out = renderStatus(d, { committed: true });
    assert.match(out, /m a\.mjs/, 'lowercase under committed');
    assert.match(out, /M a\.mjs/, 'uppercase under unstaged');
    assert.equal(out.match(/a\.mjs/g).length, 2, 'listed exactly twice');
});

test('renderStatus: committed view on a clean tree still renders nothing', () => {
    const d = { branch: 'main', staged: [], unstaged: [], untracked: [] };
    assert.equal(renderStatus(d, { committed: true }), '');
});

test('renderStatus: the heading column stays aligned across the groups', () => {
    // "committed" and "untracked" are both 9 characters, so padding is unaffected.
    const heads = headingLines(renderStatus(mixedTree(), { committed: true }));
    assert.equal(heads.length, 3);
    assert.equal(new Set(heads.map((l) => displayWidth(plain(l)))).size, 1, 'all three headings same width');
});

test('renderStatus: every group carries a marker, and all of one width', () => {
    // The marker's shape is style and is deliberately not named, but it has to
    // exist and be consistent: the entries below are aligned to it, so two groups
    // with differently wide markers would misalign the whole tree.
    const heads = headingLines(renderStatus(mixedTree()));
    assert.equal(heads.length, 3);
    const offsets = new Set(heads.map((l) => {
        const word = l.trim().split(/\s+/).pop();
        return displayWidth(plain(l).trimEnd()) - displayWidth(word);
    }));
    assert.equal(offsets.size, 1, 'every group marker is the same width');
    // At least a marker and the space after it, or the word would sit at column 0.
    assert.ok([...offsets][0] >= 2, 'and it displaces at least a marker and a space');
});

test('renderStatus: entries sit under their heading, whatever the marker is', () => {
    const out = renderStatus(mixedTree());
    const head = headingLines(out)[0];
    const word = head.trim().split(/\s+/).pop();
    // The heading is marker, space, word: so the difference in width *is* the
    // column the word starts at, and that is where the entries have to line up.
    // Deriving it keeps this test alive across a change of marker, and makes a
    // two-column glyph fail here rather than silently misaligning the entries.
    const wordColumn = displayWidth(plain(head).trimEnd()) - displayWidth(word);
    const indent = ' '.repeat(wordColumn);
    // Heading lines start at column 0; anything indented is an entry.
    const entries = plain(out).split('\n').filter((l) => /^\s+\S/.test(l));
    assert.equal(entries.length, 4, 'two staged, one unstaged, one untracked');
    for (const line of entries) {
        assert.ok(line.startsWith(indent), `"${line}" should be indented by ${wordColumn}`);
    }
});

test('renderCommitSuccess: keeps branch, hash, subject and stat; drops noise', () => {
    const out = renderCommitSuccess(
        [
            '[master e3cd348] fourth',
            ' Author: someone <s@e.st>',
            ' 1 file changed, 1 insertion(+)',
            ' create mode 100644 new.txt',
            ' delete mode 100644 old.txt',
        ].join('\n'),
    );
    assert.match(out, /\[master e3cd348\] fourth/);
    assert.match(out, /1 file changed, 1 insertion/);
    assert.doesNotMatch(out, /Author:/, 'author line is noise for a single-user repo');
    assert.doesNotMatch(out, /create mode|delete mode/, 'modes duplicate the status tree');
});

test('renderCommitSuccess: no trailing blank lines', () => {
    const out = renderCommitSuccess('[main abc1234] msg\n 1 file changed\n\n\n');
    assert.equal(out.split('\n').length, 2);
});

test('renderCommitFailure: extracts only the concluding line, drops hint', () => {
    const stdout = [
        'On branch master',
        'Untracked files:',
        '  (use "git add <file>..." to include in what will be committed)',
        '\tnew.txt',
        '',
        'nothing added to commit but untracked files present (use "git add" to track)',
    ].join('\n');
    const out = renderCommitFailure(stdout);
    assert.equal(out, 'nothing added to commit but untracked files present');
    assert.doesNotMatch(out, /On branch/);
    assert.doesNotMatch(out, /new\.txt/);
});

test('renderCommitFailure: clean tree renders nothing', () => {
    assert.equal(renderCommitFailure('On branch master\nnothing to commit, working tree clean'), '');
});

test('renderCommitFailure: unknown output is passed through, not swallowed', () => {
    const out = renderCommitFailure('something unexpected happened');
    assert.equal(out, 'something unexpected happened');
});

test('renderCommitFailure: handles a message with no trailing hint', () => {
    const out = renderCommitFailure(
        'On branch master\nnothing added to commit but untracked files present',
    );
    assert.equal(out, 'nothing added to commit but untracked files present');
});