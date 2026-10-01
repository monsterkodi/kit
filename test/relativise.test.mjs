// relativise.test.mjs 
//
// tests cwd-relative path handling.
//
// `git status --porcelain=v2 -z` reports paths relative to the repository
// root regardless of cwd, so kit rewrites them to match what git's own
// non-porcelain output would show. These tests pin that behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeTo, parseStatusV2, relativise } from '../lib/git.mjs';

const NUL = '\0';

test('relativeTo: paths inside the prefix lose it', () => {
  assert.equal(relativeTo('lib/b.mjs', 'lib/'), 'b.mjs');
  assert.equal(relativeTo('lib/deep/x.txt', 'lib/'), 'deep/x.txt');
  assert.equal(relativeTo('lib/deep/x.txt', 'lib/deep/'), 'x.txt');
});

test('relativeTo: siblings gain one ../ per level climbed', () => {
  assert.equal(relativeTo('test/c.mjs', 'lib/'), '../test/c.mjs');
  assert.equal(relativeTo('top.txt', 'lib/'), '../top.txt');
  assert.equal(relativeTo('lib/b.mjs', 'test/'), '../lib/b.mjs');
  assert.equal(relativeTo('x.txt', 'deep/a/'), '../../x.txt');
  assert.equal(relativeTo('a/b/c/d.txt', 'a/b/c/'), 'd.txt');
});

test('relativeTo: empty prefix (repo root) is a no-op', () => {
  assert.equal(relativeTo('top.txt', ''), 'top.txt');
  assert.equal(relativeTo('lib/b.mjs', ''), 'lib/b.mjs');
});

test('relativise: rewrites all three groups', () => {
  const raw = [
    '1 M. N... 100644 100644 100644 a b lib/b.mjs',
    '1 .M N... 100644 100644 100644 a c test/c.mjs',
    '? lib/new.txt',
  ].join(NUL) + NUL;
  const data = parseStatusV2(raw);
  const out = relativise(data, 'lib/');
  assert.equal(out.staged[0].path, 'b.mjs');
  assert.equal(out.unstaged[0].path, '../test/c.mjs');
  assert.equal(out.untracked[0].path, 'new.txt');
});

test('relativise: rename origin is dropped, since the new path is relative', () => {
  const raw = ['2 RM N... 100644 100644 100644 a b R100 lib/new.txt', 'lib/old.txt'].join(NUL) + NUL;
  const data = parseStatusV2(raw);
  const out = relativise(data, 'lib/');
  assert.equal(out.staged[0].path, 'new.txt');
  assert.equal(out.staged[0].orig, undefined);
});

test('relativise: is a no-op at the repository root', () => {
  const raw = ['1 M. N... 100644 100644 100644 a b lib/b.mjs'].join(NUL) + NUL;
  const out = relativise(parseStatusV2(raw), '');
  assert.equal(out.staged[0].path, 'lib/b.mjs');
});
