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
    assert.match(out,style.headerOf('~/s/kit','↑2'))
    return assert.equal(style.headingLines(out).length,0,'a clean tree has no sections to list')
})
test('renderStatus: a clean tree behind its upstream renders the header alone',function ()
{
    var d, out

    d = {root:'/home/kodi/s/kit',branch:'main',ahead:0,behind:3,staged:[],unstaged:[],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    assert.equal(style.plain(out).split('\n').length,1)
    return assert.match(out,style.headerOf('~/s/kit','↓3'))
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

    d = {branch:'branch',ahead:2,behind:0,detached:false,staged:[{path:'src/new.mjs',code:'A'}],unstaged:[{path:'src/a.mjs',code:'M'}],untracked:[{path:'build/'}]}
    out = render.renderStatus(d,{theme:style.plainTheme})
    assert.match(out,/branch\x20↑2/)
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

    d = {root:'/home/kodi/s/kit',branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('~/s/kit','branch'))
})
test('renderStatus: the root identifies the repository, not the directory kit ran in',function ()
{
    var d, out

    d = {root:'/home/kodi/a',branch:'branch',staged:[],unstaged:[{path:'../top.txt',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('~/a','branch'))
})
test('renderStatus: ahead and behind stay legible after the root',function ()
{
    var d, header

    d = {root:'/home/kodi/s/kit',branch:'branch',ahead:2,behind:1,staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    header = style.plain(render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))).split('\n')[0]
    return assert.match(header,style.headerOf('~/s/kit','branch ↑2 ↓1'))
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

    d = {root:'/tmp/kit-test-1',branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('/tmp/kit-test-1','branch'))
})
test('renderStatus: a root that merely starts with home is not shortened',function ()
{
    var d, out

    d = {root:'/home/kodi-other',branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.match(out,style.headerOf('/home/kodi-other','branch'))
})
test('renderStatus: without a root the header is the branch alone',function ()
{
    var d, out

    d = {branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
    out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
    return assert.equal(style.plain(out).split('\n')[0],'branch')
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC9yZW5kZXIudGVzdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09BZ0JPLEtBQUssS0FBSztPQUNWLE9BQU8sS0FBSzs7Ozs7OztBQU1uQixNQUFNO0FBRU4sS0FBSzs7OztJQUVELE9BQ0ksNEJBQ0EscUJBQ0EsZ0NBQ0Esb0JBQ0EsbURBQ0EsbURBQ0EsWUFDRSxLQUFLLE9BQU87SUFFbEIsSUFBSSxJQUFJLGNBQWM7SUFFdEIsT0FBTyxNQUFNLEVBQUUsT0FBUTtJQUN2QixPQUFPLE1BQU0sRUFBRSxTQUFVO0lBQ3pCLE9BQU8sTUFBTSxFQUFFLE1BQU87SUFDdEIsT0FBTyxNQUFNLEVBQUUsT0FBUTtJQUN2QixPQUFPLFVBQVUsRUFBRSxTQUFVLEtBQU0sWUFBYSxLQUFNO0lBQ3RELE9BQU8sVUFBVSxFQUFFLFdBQVksS0FBTSxZQUFhLEtBQU07V0FDeEQsT0FBTyxVQUFVLEVBQUUsWUFBYSxLQUFNLFNBQVUsS0FBTTs7QUFFMUQsS0FBSzs7OztJQUVELE9BQ0ksMERBQ0EsV0FDRSxLQUFLLE9BQU87SUFFbEIsSUFBSSxJQUFJLGNBQWM7SUFFdEIsT0FBTyxNQUFNLEVBQUUsT0FBTyxPQUFRO0lBQzlCLE9BQU8sTUFBTSxFQUFFLE9BQU8sR0FBRyxLQUFNO1dBQy9CLE9BQU8sTUFBTSxFQUFFLE9BQU8sR0FBRyxLQUFNOztBQUVuQyxLQUFLOzs7O0lBRUQsT0FBTyxrREFBa0QsS0FBSyxPQUFPO0lBRXJFLElBQUksSUFBSSxjQUFjO1dBRXRCLE9BQU8sTUFBTSxFQUFFLE9BQU8sR0FBRyxLQUFNOztBQWNuQyxLQUFLOzs7O0lBRUQsS0FBSSxPQUFRLE9BQVEsVUFBWSxZQUFjO1dBRTlDLE9BQU8sTUFBTSxPQUFPLGFBQWEsR0FBSSxNQUFPLE1BQU0sYUFBYzs7QUFFcEUsS0FBSzs7OztJQUVELEtBQUksT0FBUSxPQUFRLE1BQU8sRUFBRyxPQUFRLEVBQUcsVUFBWSxZQUFjO1dBRW5F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
//# sourceURL=file://kode/test/render.test.kode
