var NUL

import test from 'node:test'
import assert from 'node:assert/strict'
import git from "../git.js"

NUL = '\0'
test('relativeTo: paths inside the prefix lose it',function ()
{
    assert.equal(git.relativeTo('lib/b.mjs','lib/'),'b.mjs')
    assert.equal(git.relativeTo('lib/deep/x.txt','lib/'),'deep/x.txt')
    return assert.equal(git.relativeTo('lib/deep/x.txt','lib/deep/'),'x.txt')
})
test('relativeTo: siblings gain one ../ per level climbed',function ()
{
    assert.equal(git.relativeTo('test/c.mjs','lib/'),'../test/c.mjs')
    assert.equal(git.relativeTo('top.txt','lib/'),'../top.txt')
    assert.equal(git.relativeTo('lib/b.mjs','test/'),'../lib/b.mjs')
    assert.equal(git.relativeTo('x.txt','deep/a/'),'../../x.txt')
    return assert.equal(git.relativeTo('a/b/c/d.txt','a/b/c/'),'d.txt')
})
test('relativeTo: empty prefix (repo root) is a no-op',function ()
{
    assert.equal(git.relativeTo('top.txt',''),'top.txt')
    return assert.equal(git.relativeTo('lib/b.mjs',''),'lib/b.mjs')
})
test('relativise: rewrites all three groups',function ()
{
    var data, out, raw

    raw = ['1 M. N... 100644 100644 100644 a b lib/b.mjs','1 .M N... 100644 100644 100644 a c test/c.mjs','? lib/new.txt'].join(NUL) + NUL
    data = git.parseStatusV2(raw)
    out = git.relativise(data,'lib/')
    assert.equal(out.staged[0].path,'b.mjs')
    assert.equal(out.unstaged[0].path,'../test/c.mjs')
    return assert.equal(out.untracked[0].path,'new.txt')
})
test('relativise: rename origin is dropped, since the new path is relative',function ()
{
    var data, out, raw

    raw = ['2 RM N... 100644 100644 100644 a b R100 lib/new.txt','lib/old.txt'].join(NUL) + NUL
    data = git.parseStatusV2(raw)
    out = git.relativise(data,'lib/')
    assert.equal(out.staged[0].path,'new.txt')
    return assert.equal(out.staged[0].orig,undefined)
})
test('relativise: is a no-op at the repository root',function ()
{
    var out, raw

    raw = ['1 M. N... 100644 100644 100644 a b lib/b.mjs'].join(NUL) + NUL
    out = git.relativise(git.parseStatusV2(raw),'')
    return assert.equal(out.staged[0].path,'lib/b.mjs')
})