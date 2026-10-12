var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var mixedTree, NUL

import test from 'node:test'
import assert from 'node:assert/strict'
import git from "../git.js"

import render from "../render.js"

import style from "./style.js"

NUL = '\0'
test('parseStatusV2: headers, staged/unstaged split',function ()
{
    var d, raw

    raw = ['# branch.oid abc123def456','# branch.head main','# branch.upstream origin/main','# branch.ab +2 -1','1 M. N... 100644 100644 100644 aaa bbb src/a.mjs','1 .M N... 100644 100644 100644 aaa ccc src/b.mjs','? build/'].join(NUL) + NUL
    d = git.parseStatusV2(raw)
    assert.equal(d.branch,'main')
    assert.equal(d.upstream,'origin/main')
    assert.equal(d.ahead,2)
    assert.equal(d.behind,1)
    assert.deepEqual(d.staged,[{path:'src/a.mjs',code:'M'}])
    assert.deepEqual(d.unstaged,[{path:'src/b.mjs',code:'M'}])
    return assert.deepEqual(d.untracked,[{path:'build/',code:'?'}])
})
test('parseStatusV2: rename consumes the origin path record',function ()
{
    var d, raw

    raw = ['2 RM N... 100644 100644 100644 aaa bbb R100 renamed.txt','a b.txt'].join(NUL) + NUL
    d = git.parseStatusV2(raw)
    assert.equal(d.staged.length,1)
    assert.equal(d.staged[0].path,'renamed.txt')
    return assert.equal(d.staged[0].orig,'a b.txt')
})
test('parseStatusV2: filename with a space is one path',function ()
{
    var d, raw

    raw = ['1 A. N... 100644 100644 100644 a b my file.txt'].join(NUL) + NUL
    d = git.parseStatusV2(raw)
    return assert.equal(d.staged[0].path,'my file.txt')
})
test('renderStatus: clean tree renders nothing',function ()
{
    var d

    d = {branch:'main',staged:[],unstaged:[],untracked:[]}
    return assert.equal(render.renderStatus(d,{theme:style.plainTheme}),'')
})
test('renderStatus: a clean tree in sync with its upstream renders nothing',function ()
{
    var d

    d = {branch:'main',ahead:0,behind:0,staged:[],unstaged:[],untracked:[]}
    return assert.equal(render.renderStatus(d,{theme:style.plainTheme}),'','in sync is not worth a line')
})
test('renderStatus: a clean tree ahead of its upstream renders the header alone',function ()
{
    var d, out

    d = {root:'/home/kodi/s/kit',branch:'main',ahead:2,behind:0,staged:[],unstaged:[],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    assert.equal(style.plain(out).split('\n').length,1,'the header, and nothing after it')
    assert.match(out,style.headerOf('~/s/kit','main ↑2'))
    return assert.equal(style.headingLines(out).length,0,'a clean tree has no sections to list')
})
test('renderStatus: a clean tree behind its upstream renders the header alone',function ()
{
    var d, out

    d = {root:'/home/kodi/s/kit',branch:'main',ahead:0,behind:3,staged:[],unstaged:[],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    assert.equal(style.plain(out).split('\n').length,1)
    return assert.match(out,style.headerOf('~/s/kit','main ↓3'))
})
test('outOfSync: only a branch with commits on one side counts',function ()
{
    assert.equal(render.outOfSync({ahead:0,behind:0}),false)
    assert.equal(render.outOfSync({}),false,'no upstream means nothing to be out of sync with')
    assert.equal(render.outOfSync(),false)
    assert.equal(render.outOfSync({ahead:1,behind:0}),true)
    return assert.equal(render.outOfSync({ahead:0,behind:1}),true)
})
test('renderStatus: dirty tree has branch header and all three sections',function ()
{
    var d, out

    d = {branch:'main',ahead:2,behind:0,detached:false,staged:[{path:'src/new.mjs',code:'A'}],unstaged:[{path:'src/a.mjs',code:'M'}],untracked:[{path:'build/'}]}
    out = render.renderStatus(d,{theme:style.plainTheme})
    assert.match(out,/main\x20↑2/)
    assert.match(out,style.headingOf('staged'))
    assert.match(out,style.headingOf('unstaged'))
    assert.match(out,style.headingOf('untracked'))
    assert.match(out,/A\x20src\/new\.mjs/)
    assert.match(out,/M\x20src\/a\.mjs/)
    return assert.match(out,/\?\x20build\//)
})
test('renderStatus: empty sections are omitted and the last group closes the list',function ()
{
    var d, heads

    d = {branch:'main',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    heads = style.headingLines(render.renderStatus(d,{theme:style.plainTheme}))
    assert.doesNotMatch(heads.join('\n'),style.headingOf('staged'),'an empty group is not rendered')
    assert.equal(heads.length,1,'only the one non-empty group renders')
    return assert.match(heads[0],style.headingOf('unstaged'),'the only group is also the last')
})
test('renderBranch: detached head shows short oid',function ()
{
    var out

    out = render.renderBranch({detached:true,oid:'abcdef1234567890'},{theme:style.plainTheme})
    return assert.match(out,/detached@abcdef1/)
})
test('renderStatus: the header names the repository root, then the branch',function ()
{
    var d, out

    d = {root:'/home/kodi/s/kit',branch:'main',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('~/s/kit','main'))
})
test('renderStatus: the root identifies the repository, not the directory kit ran in',function ()
{
    var d, out

    d = {root:'/home/kodi/a',branch:'master',staged:[],unstaged:[{path:'../top.txt',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('~/a','master'))
})
test('renderStatus: ahead and behind stay legible after the root',function ()
{
    var d, header

    d = {root:'/home/kodi/s/kit',branch:'main',ahead:2,behind:1,staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    header = style.plain(render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))).split('\n')[0]
    return assert.match(header,style.headerOf('~/s/kit','main ↑2 ↓1'))
})
test('renderStatus: a detached head keeps its short oid beside the root',function ()
{
    var d, out

    d = {root:'/home/kodi/s/kit',detached:true,oid:'abcdef1234567890',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('~/s/kit','detached@abcdef1'))
})
test('renderStatus: a root outside home is shown in full',function ()
{
    var d, out

    d = {root:'/tmp/kit-test-1',branch:'main',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('/tmp/kit-test-1','main'))
})
test('renderStatus: a root that merely starts with home is not shortened',function ()
{
    var d, out

    d = {root:'/home/kodi-other',branch:'main',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('/home/kodi-other','main'))
})
test('renderStatus: without a root the header is the branch alone',function ()
{
    var d, out

    d = {branch:'main',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.equal(style.plain(out).split('\n')[0],'main')
})
test('abbreviateHome: a path under home loses the prefix',function ()
{
    assert.equal(render.abbreviateHome('/home/kodi/s/kit','/home/kodi'),'~/s/kit')
    return assert.equal(render.abbreviateHome('/home/kodi','/home/kodi'),'~')
})
test('abbreviateHome: everything else is left exactly as it is',function ()
{
    assert.equal(render.abbreviateHome('/tmp/x','/home/kodi'),'/tmp/x')
    assert.equal(render.abbreviateHome('/home/kodi-other','/home/kodi'),'/home/kodi-other')
    assert.equal(render.abbreviateHome('~/s/kit','/home/kodi'),'~/s/kit')
    return assert.equal(render.abbreviateHome('/home/kodi/s/kit','/home/kodi/'),'~/s/kit','a trailing slash on home')
})
test('abbreviateHome: with no home to compare against, the path stands',function ()
{
    assert.equal(render.abbreviateHome('/home/kodi/s/kit',undefined),'/home/kodi/s/kit')
    return assert.equal(render.abbreviateHome('/home/kodi/s/kit',''),'/home/kodi/s/kit')
})
test('renderTracking: in-sync renders empty',function ()
{
    assert.equal(render.renderTracking({ahead:0,behind:0},{theme:style.plainTheme}),'')
    return assert.match(render.renderTracking({ahead:3,behind:1},{theme:style.plainTheme}),/↑3\x20↓1/)
})

mixedTree = function ()
{
    return {branch:'main',ahead:0,behind:0,detached:false,staged:[{path:'lib/add.mjs',code:'A'},{path:'README.md',code:'M'}],unstaged:[{path:'../kit.md',code:'M'}],untracked:[{path:'notes.tmp',code:'?'}]}
}
test('renderStatus: committed view renames the staged heading',function ()
{
    var out

    out = render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme})
    assert.match(out,style.headingOf('committed'),'staged heading becomes committed')
    assert.doesNotMatch(out,style.headingOf('staged'),'staged heading is gone')
    assert.match(out,style.headingOf('unstaged'),'unstaged is untouched')
    return assert.match(out,style.headingOf('untracked'),'untracked is untouched')
})
test('renderStatus: default view still says staged',function ()
{
    var out

    out = render.renderStatus(mixedTree(),{theme:style.plainTheme})
    assert.match(out,style.headingOf('staged'))
    return assert.doesNotMatch(out,/committed/)
})
test('renderStatus: committed view lowercases letters in that section only',function ()
{
    var out

    out = render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme})
    assert.match(out,/a\x20lib\/add\.mjs/)
    assert.match(out,/m\x20README\.md/)
    return assert.match(out,/M\x20\.\.\/kit\.md/)
})
test('renderStatus: deletion letter is lowercased in the committed view',function ()
{
    var d, out

    d = {branch:'main',staged:[{path:'old.sh',code:'D'}],unstaged:[],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{committed:true},{theme:style.plainTheme}))
    return assert.match(out,/d\x20old\.sh/)
})
test('renderStatus: committed view keeps untracked question mark',function ()
{
    var out

    out = render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme})
    return assert.match(out,/\?\x20notes\.tmp/,'the ? marker is unchanged')
})
test('renderStatus: a file in both committed and unstaged renders in both',function ()
{
    var d, out

    d = {branch:'main',staged:[{path:'a.mjs',code:'M'}],unstaged:[{path:'a.mjs',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{committed:true},{theme:style.plainTheme}))
    assert.match(out,/m\x20a\.mjs/,'lowercase under committed')
    assert.match(out,/M\x20a\.mjs/,'uppercase under unstaged')
    return assert.equal(out.match(/a\.mjs/g).length,2,'listed exactly twice')
})
test('renderStatus: committed view on a clean tree still renders nothing',function ()
{
    var d, out

    d = {branch:'main',staged:[],unstaged:[],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{committed:true},{theme:style.plainTheme}))
    return assert.equal(out,'')
})
test('renderStatus: the heading column stays aligned across the groups',function ()
{
    var heads, l, widths

    heads = style.headingLines(render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme}))
    assert.equal(heads.length,3)
    widths = new Set
    var list = _k_.list(heads)
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        l = list[_a_]
        widths.add(render.displayWidth(style.plain(l)))
    }
    return assert.equal(widths.size,1,'all three headings same width')
})
test('renderStatus: every group carries a marker, and all of one width',function ()
{
    var heads, l, offsets, word

    heads = style.headingLines(render.renderStatus(mixedTree(),{theme:style.plainTheme}))
    assert.equal(heads.length,3)
    offsets = new Set
    var list = _k_.list(heads)
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        l = list[_b_]
        word = l.trim().split(/\s+/).pop()
        offsets.add(render.displayWidth(style.plain(l).trimEnd()) - render.displayWidth(word))
    }
    assert.equal(offsets.size,1,'every group marker is the same width')
    return assert.ok(Array.from(offsets)[0] >= 2,'and it displaces at least a marker and a space')
})
test('renderStatus: entries sit under their heading, whatever the marker is',function ()
{
    var entries, head, indent, line, out, word, wordColumn

    out = render.renderStatus(mixedTree(),{theme:style.plainTheme})
    head = style.headingLines(out)[0]
    word = head.trim().split(/\s+/).pop()
    wordColumn = render.displayWidth(style.plain(head).trimEnd()) - render.displayWidth(word)
    indent = ' '.repeat(wordColumn)
    entries = style.plain(out).split('\n').filter(function (l)
    {
        return (/^\s+\S/).test(l)
    })
    assert.equal(entries.length,4,'two staged, one unstaged, one untracked')
    var list = _k_.list(entries)
    for (var _c_ = 0; _c_ < list.length; _c_++)
    {
        line = list[_c_]
        assert.ok(line.startsWith(indent),`\"${line}\" should be indented by ${wordColumn}`)
    }
})
test('renderCommitSuccess: keeps branch, hash, subject and stat; drops noise',function ()
{
    var out, stdout

    stdout = ['[master e3cd348] fourth',' Author: someone <s@e.st>',' 1 file changed, 1 insertion(+)',' create mode 100644 new.txt',' delete mode 100644 old.txt'].join('\n')
    out = render.renderCommitSuccess(stdout,{theme:style.plainTheme})
    assert.match(out,/\[master\x20e3cd348\]\x20fourth/)
    assert.match(out,/1\x20file\x20changed,\x201\x20insertion/)
    assert.doesNotMatch(out,/Author:/,'author line is noise for a single-user repo')
    return assert.doesNotMatch(out,/create\x20mode|delete\x20mode/,'modes duplicate the status tree')
})
test('renderCommitSuccess: no trailing blank lines',function ()
{
    var out

    out = render.renderCommitSuccess('[main abc1234] msg\n 1 file changed\n\n\n',{theme:style.plainTheme})
    return assert.equal(out.split('\n').length,2)
})
test('renderCommitFailure: extracts only the concluding line, drops hint',function ()
{
    var out, stdout

    stdout = ['On branch master','Untracked files:','  (use "git add <file>..." to include in what will be committed)','\tnew.txt','','nothing added to commit but untracked files present (use "git add" to track)'].join('\n')
    out = render.renderCommitFailure(stdout,{theme:style.plainTheme})
    assert.equal(out,'nothing added to commit but untracked files present')
    assert.doesNotMatch(out,/On\x20branch/)
    return assert.doesNotMatch(out,/new\.txt/)
})
test('renderCommitFailure: clean tree renders nothing',function ()
{
    var out

    out = render.renderCommitFailure('On branch master\nnothing to commit, working tree clean',{theme:style.plainTheme})
    return assert.equal(out,'')
})
test('renderCommitFailure: unknown output is passed through, not swallowed',function ()
{
    var out

    out = render.renderCommitFailure('something unexpected happened',{theme:style.plainTheme})
    return assert.equal(out,'something unexpected happened')
})
test('renderCommitFailure: handles a message with no trailing hint',function ()
{
    var out

    out = render.renderCommitFailure('On branch master\nnothing added to commit but untracked files present')
    return assert.equal(out,'nothing added to commit but untracked files present')
})