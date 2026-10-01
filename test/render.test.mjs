// render.test.mjs — unit tests for the pure renderers.
//
// No git, no repository, no child processes: these assert layout and colour
// decisions directly. Run with NO_COLOR=1 so assertions stay readable.

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusV2 } from '../lib/git.mjs';
import { renderStatus, renderBranch, renderCommitSuccess, renderCommitFailure, renderTracking } from '../lib/render.mjs';

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
  assert.match(out, /├ staged/);
  assert.match(out, /├ unstaged/);
  assert.match(out, /└ untracked/);
  assert.match(out, /A src\/new\.mjs/);
  assert.match(out, /M src\/a\.mjs/);
  assert.match(out, /\? build\//);
});

test('renderStatus: empty sections are omitted and the last one closes with └', () => {
  const d = {
    branch: 'main', staged: [], unstaged: [{ path: 'a', code: 'M' }], untracked: [],
  };
  const out = renderStatus(d);
  // Anchor on the heading line: /staged/ alone would also match "unstaged".
  assert.doesNotMatch(out, /^├ staged/m);
  assert.match(out, /^└ unstaged/m);
});

test('renderBranch: detached head shows short oid', () => {
  const out = renderBranch({ detached: true, oid: 'abcdef1234567890' });
  assert.match(out, /detached@abcdef1/);
});

test('renderTracking: in-sync renders empty', () => {
  assert.equal(renderTracking({ ahead: 0, behind: 0 }), '');
  assert.match(renderTracking({ ahead: 3, behind: 1 }), /↓3 ↑1/);
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