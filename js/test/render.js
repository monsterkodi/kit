var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var d, entries, head, header, heads, indent, l, line, mixedTree, NUL, offsets, out, raw, stdout, t, widths, word, wordColumn

import git from "../git.js"

import render from "../render.js"

import theme from "../theme.js"

import style from "./style.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches

NUL = '\0'

mixedTree = function ()
{
    return {branch:'main',ahead:0,behind:0,detached:false,staged:[{path:'lib/add.mjs',code:'A'},{path:'README.md',code:'M'}],unstaged:[{path:'../kit.md',code:'M'}],untracked:[{path:'notes.tmp',code:'?'}]}
}
toExport["parseStatusV2"] = async function ()
{
    await section("headers, staged/unstaged split", async function ()
    {
        raw = ['# branch.oid abc123def456','# branch.head main','# branch.upstream origin/main','# branch.ab +2 -1','1 M. N... 100644 100644 100644 aaa bbb src/a.mjs','1 .M N... 100644 100644 100644 aaa ccc src/b.mjs','? build/'].join(NUL) + NUL
        d = git.parseStatusV2(raw)
        compare(d.branch,'main')
        compare(d.upstream,'origin/main')
        compare(d.ahead,2)
        compare(d.behind,1)
        compare(d.staged,[{path:'src/a.mjs',code:'M'}])
        compare(d.unstaged,[{path:'src/b.mjs',code:'M'}])
        compare(d.untracked,[{path:'build/',code:'?'}])
    })
    await section("rename consumes the origin path record", async function ()
    {
        raw = ['2 RM N... 100644 100644 100644 aaa bbb R100 renamed.txt','a b.txt'].join(NUL) + NUL
        d = git.parseStatusV2(raw)
        compare(d.staged.length,1)
        compare(d.staged[0].path,'renamed.txt')
        compare(d.staged[0].orig,'a b.txt')
    })
    await section("filename with a space is one path", async function ()
    {
        raw = ['1 A. N... 100644 100644 100644 a b my file.txt'].join(NUL) + NUL
        d = git.parseStatusV2(raw)
        compare(d.staged[0].path,'my file.txt')
    })
}
toExport["parseStatusV2"]._section_ = true
toExport["renderStatus"] = async function ()
{
    await section("clean tree renders nothing", async function ()
    {
        d = {branch:'main',staged:[],unstaged:[],untracked:[]}
        compare(render.renderStatus(d,{theme:style.plainTheme}),'')
    })
    await section("a clean tree in sync with its upstream renders nothing", async function ()
    {
        d = {branch:'main',ahead:0,behind:0,staged:[],unstaged:[],untracked:[]}
        compare(render.renderStatus(d,{theme:style.plainTheme}),'')
    })
    await section("a clean tree ahead of its upstream renders the header alone", async function ()
    {
        d = {root:'/home/kodi/s/kit',branch:'main',ahead:2,behind:0,staged:[],unstaged:[],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        compare(style.plain(out).split('\n').length,1)
        matches(out,style.headerOf('~/s/kit','↑2'))
        compare(style.headingLines(out).length,0)
    })
    await section("a clean tree behind its upstream renders the header alone", async function ()
    {
        d = {root:'/home/kodi/s/kit',branch:'main',ahead:0,behind:3,staged:[],unstaged:[],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        compare(style.plain(out).split('\n').length,1)
        matches(out,style.headerOf('~/s/kit','↓3'))
    })
    await section("dirty tree has branch header and all three sections", async function ()
    {
        d = {branch:'branch',ahead:2,behind:0,detached:false,staged:[{path:'src/new.mjs',code:'A'}],unstaged:[{path:'src/a.mjs',code:'M'}],untracked:[{path:'build/'}]}
        out = render.renderStatus(d,{theme:style.plainTheme})
        matches(out,/branch\x20↑2/)
        matches(out,style.headingOf('staged'))
        matches(out,style.headingOf('unstaged'))
        matches(out,style.headingOf('untracked'))
        matches(out,/A\x20src\/new\.mjs/)
        matches(out,/M\x20src\/a\.mjs/)
        matches(out,/\?\x20build\//)
    })
    await section("empty sections are omitted and the last group closes the list", async function ()
    {
        d = {branch:'main',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        heads = style.headingLines(render.renderStatus(d,{theme:style.plainTheme}))
        notMatches(heads.join('\n'),style.headingOf('staged'))
        compare(heads.length,1)
        matches(heads[0],style.headingOf('unstaged'))
    })
    await section("the header names the repository root, then the branch", async function ()
    {
        d = {root:'/home/kodi/s/kit',branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        matches(out,style.headerOf('~/s/kit','branch'))
    })
    await section("the root identifies the repository, not the directory kit ran in", async function ()
    {
        d = {root:'/home/kodi/a',branch:'branch',staged:[],unstaged:[{path:'../top.txt',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        matches(out,style.headerOf('~/a','branch'))
    })
    await section("ahead and behind stay legible after the root", async function ()
    {
        d = {root:'/home/kodi/s/kit',branch:'branch',ahead:2,behind:1,staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        header = style.plain(render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))).split('\n')[0]
        matches(header,style.headerOf('~/s/kit','branch ↑2 ↓1'))
    })
    await section("a detached head keeps its short oid beside the root", async function ()
    {
        d = {root:'/home/kodi/s/kit',detached:true,oid:'abcdef1234567890',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        matches(out,style.headerOf('~/s/kit','detached@abcdef1'))
    })
    await section("a root outside home is shown in full", async function ()
    {
        d = {root:'/tmp/kit-test-1',branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        matches(out,style.headerOf('/tmp/kit-test-1','branch'))
    })
    await section("a root that merely starts with home is not shortened", async function ()
    {
        d = {root:'/home/kodi-other',branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        matches(out,style.headerOf('/home/kodi-other','branch'))
    })
    await section("without a root the header is the branch alone", async function ()
    {
        d = {branch:'branch',staged:[],unstaged:[{path:'a',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{home:'/home/kodi'},{theme:style.plainTheme}))
        compare(style.plain(out).split('\n')[0],'branch')
    })
}
toExport["renderStatus"]._section_ = true
toExport["outOfSync"] = async function ()
{
    await section("only a branch with commits on one side counts", async function ()
    {
        compare(render.outOfSync({ahead:0,behind:0}),false)
        compare(render.outOfSync({}),false)
        compare(render.outOfSync(),false)
        compare(render.outOfSync({ahead:1,behind:0}),true)
        compare(render.outOfSync({ahead:0,behind:1}),true)
    })
}
toExport["outOfSync"]._section_ = true
toExport["renderBranch"] = async function ()
{
    await section("detached head shows short oid", async function ()
    {
        out = render.renderBranch({detached:true,oid:'abcdef1234567890'},{theme:style.plainTheme})
        matches(out,/detached@abcdef1/)
    })
}
toExport["renderBranch"]._section_ = true
toExport["abbreviateHome"] = async function ()
{
    await section("a path under home loses the prefix", async function ()
    {
        compare(render.abbreviateHome('/home/kodi/s/kit','/home/kodi'),'~/s/kit')
        compare(render.abbreviateHome('/home/kodi','/home/kodi'),'~')
    })
    await section("everything else is left exactly as it is", async function ()
    {
        compare(render.abbreviateHome('/tmp/x','/home/kodi'),'/tmp/x')
        compare(render.abbreviateHome('/home/kodi-other','/home/kodi'),'/home/kodi-other')
        compare(render.abbreviateHome('~/s/kit','/home/kodi'),'~/s/kit')
        compare(render.abbreviateHome('/home/kodi/s/kit','/home/kodi/'),'~/s/kit')
    })
    await section("with no home to compare against, the path stands", async function ()
    {
        compare(render.abbreviateHome('/home/kodi/s/kit',undefined),'/home/kodi/s/kit')
        compare(render.abbreviateHome('/home/kodi/s/kit',''),'/home/kodi/s/kit')
    })
}
toExport["abbreviateHome"]._section_ = true
toExport["renderTracking"] = async function ()
{
    await section("in-sync renders empty", async function ()
    {
        compare(render.renderTracking({ahead:0,behind:0},{theme:style.plainTheme}),'')
        matches(render.renderTracking({ahead:3,behind:1},{theme:style.plainTheme}),/↑3\x20↓1/)
    })
}
toExport["renderTracking"]._section_ = true
toExport["renderStatus committed view"] = async function ()
{
    await section("renames the staged heading", async function ()
    {
        out = render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme})
        matches(out,style.headingOf('committed'))
        notMatches(out,style.headingOf('staged'))
        matches(out,style.headingOf('unstaged'))
        matches(out,style.headingOf('untracked'))
    })
    await section("the default view still says staged", async function ()
    {
        out = render.renderStatus(mixedTree(),{theme:style.plainTheme})
        matches(out,style.headingOf('staged'))
        notMatches(out,/committed/)
    })
    await section("lowercases letters in that section only", async function ()
    {
        out = render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme})
        matches(out,/a\x20lib\/add\.mjs/)
        matches(out,/m\x20README\.md/)
        matches(out,/M\x20\.\.\/kit\.md/)
    })
    await section("the deletion letter is lowercased in the committed view", async function ()
    {
        d = {branch:'main',staged:[{path:'old.sh',code:'D'}],unstaged:[],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{committed:true},{theme:style.plainTheme}))
        matches(out,/d\x20old\.sh/)
    })
    await section("keeps the untracked question mark", async function ()
    {
        out = render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme})
        matches(out,/\?\x20notes\.tmp/)
    })
    await section("a file in both committed and unstaged renders in both", async function ()
    {
        d = {branch:'main',staged:[{path:'a.mjs',code:'M'}],unstaged:[{path:'a.mjs',code:'M'}],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{committed:true},{theme:style.plainTheme}))
        matches(out,/m\x20a\.mjs/)
        matches(out,/M\x20a\.mjs/)
        compare(out.match(/a\.mjs/g).length,2)
    })
    await section("a clean tree still renders nothing", async function ()
    {
        d = {branch:'main',staged:[],unstaged:[],untracked:[]}
        out = render.renderStatus(d,Object.assign({},{committed:true},{theme:style.plainTheme}))
        compare(out,'')
    })
    await section("the heading column stays aligned across the groups", async function ()
    {
        heads = style.headingLines(render.renderStatus(mixedTree(),{committed:true,theme:style.plainTheme}))
        compare(heads.length,3)
        widths = new Set
        var list = _k_.list(heads)
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            l = list[_a_]
            widths.add(render.displayWidth(style.plain(l)))
        }
        compare(widths.size,1)
    })
    await section("every group carries a marker, and all of one width", async function ()
    {
        heads = style.headingLines(render.renderStatus(mixedTree(),{theme:style.plainTheme}))
        compare(heads.length,3)
        offsets = new Set
        var list1 = _k_.list(heads)
        for (var _b_ = 0; _b_ < list1.length; _b_++)
        {
            l = list1[_b_]
            word = l.trim().split(/\s+/).pop()
            offsets.add(render.displayWidth(style.plain(l).trimEnd()) - render.displayWidth(word))
        }
        compare(offsets.size,1)
        compare(Array.from(offsets)[0] >= 2,true)
    })
    await section("entries sit under their heading, whatever the marker is", async function ()
    {
        out = render.renderStatus(mixedTree(),{theme:style.plainTheme})
        head = style.headingLines(out)[0]
        word = head.trim().split(/\s+/).pop()
        wordColumn = render.displayWidth(style.plain(head).trimEnd()) - render.displayWidth(word)
        indent = ' '.repeat(wordColumn)
        entries = style.plain(out).split('\n').filter(function (l)
        {
            return (/^\s+\S/).test(l)
        })
        compare(entries.length,4)
        var list2 = _k_.list(entries)
        for (var _c_ = 0; _c_ < list2.length; _c_++)
        {
            line = list2[_c_]
            compare(line.startsWith(indent),true)
        }
    })
}
toExport["renderStatus committed view"]._section_ = true
toExport["renderCommitSuccess"] = async function ()
{
    await section("keeps branch, hash, subject and stat; drops noise", async function ()
    {
        stdout = ['[master e3cd348] fourth',' Author: someone <s@e.st>',' 1 file changed, 1 insertion(+)',' create mode 100644 new.txt',' delete mode 100644 old.txt'].join('\n')
        out = render.renderCommitSuccess(stdout,{theme:style.plainTheme})
        matches(out,/\[master\x20e3cd348\]\x20fourth/)
        matches(out,/1\x20file\x20changed,\x201\x20insertion/)
        notMatches(out,/Author:/)
        notMatches(out,/create\x20mode|delete\x20mode/)
    })
    await section("no trailing blank lines", async function ()
    {
        out = render.renderCommitSuccess('[main abc1234] msg\n 1 file changed\n\n\n',{theme:style.plainTheme})
        compare(out.split('\n').length,2)
    })
}
toExport["renderCommitSuccess"]._section_ = true
toExport["renderCommitFailure"] = async function ()
{
    await section("extracts only the concluding line, drops hint", async function ()
    {
        stdout = ['On branch master','Untracked files:','  (use "git add <file>..." to include in what will be committed)','\tnew.txt','','nothing added to commit but untracked files present (use "git add" to track)'].join('\n')
        out = render.renderCommitFailure(stdout,{theme:style.plainTheme})
        compare(out,'nothing added to commit but untracked files present')
        notMatches(out,/On\x20branch/)
        notMatches(out,/new\.txt/)
    })
    await section("clean tree renders nothing", async function ()
    {
        out = render.renderCommitFailure('On branch master\nnothing to commit, working tree clean',{theme:style.plainTheme})
        compare(out,'')
    })
    await section("unknown output is passed through, not swallowed", async function ()
    {
        out = render.renderCommitFailure('something unexpected happened',{theme:style.plainTheme})
        compare(out,'something unexpected happened')
    })
    await section("handles a message with no trailing hint", async function ()
    {
        out = render.renderCommitFailure('On branch master\nnothing added to commit but untracked files present')
        compare(out,'nothing added to commit but untracked files present')
    })
}
toExport["renderCommitFailure"]._section_ = true
toExport["renderNoChanges"] = async function ()
{
    await section("names the filter that matched nothing", async function ()
    {
        compare(render.renderNoChanges(['*.kode'],{theme:style.plainTheme}),'no *.kode changes')
    })
    await section("names every path of the filter", async function ()
    {
        compare(render.renderNoChanges(['*.kode','js'],{theme:style.plainTheme}),'no *.kode js changes')
    })
    await section("the name of a file type is brighter than the rest", async function ()
    {
        t = theme.createTheme(true)
        out = render.renderNoChanges(['*.kode'],{theme:t})
        compare(out,t.noneText('no *.') + t.noneName('kode') + t.noneText(' changes'))
    })
    await section("a path is the name as a whole", async function ()
    {
        t = theme.createTheme(true)
        out = render.renderNoChanges(['js/diff.js'],{theme:t})
        compare(out,t.noneText('no ') + t.noneName('js/diff.js') + t.noneText(' changes'))
    })
}
toExport["renderNoChanges"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvcmVuZGVyLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7O09BZ0JPLFVBQUE7O09BQ0EsYUFBQTs7T0FDQSxZQUFBOztPQUNELFlBQUE7O09BQ0EsY0FBQTtJQUFVO0lBQVE7O0FBRXhCLE1BQU07O0FBRU47O1lBQ0ksT0FBUSxPQUNSLE1BQU8sRUFDUCxPQUFRLEVBQ1IsU0FBVSxNQUNWLFNBQVUsS0FBTSxjQUFlLEtBQU0sTUFBTyxLQUFNLFlBQWEsS0FBTSxNQUNyRSxXQUFZLEtBQU0sWUFBYSxLQUFNLE1BQ3JDLFlBQWEsS0FBTSxZQUFhLEtBQU07Ozs7OztRQU1sQyxPQUNJLDRCQUNBLHFCQUNBLGdDQUNBLG9CQUNBLG1EQUNBLG1EQUNBLFlBQ0UsS0FBSyxPQUFPO1FBRWxCLElBQUksSUFBSSxjQUFjO1FBRWIsUUFBVCxFQUFFLE9BQVM7UUFDQSxRQUFYLEVBQUUsU0FBVztRQUNMLFFBQVIsRUFBRSxNQUFRO1FBQ0QsUUFBVCxFQUFFLE9BQVM7UUFDRixRQUFULEVBQUUsU0FBVyxLQUFNLFlBQWEsS0FBTTtRQUMzQixRQUFYLEVBQUUsV0FBYSxLQUFNLFlBQWEsS0FBTTtRQUM1QixRQUFaLEVBQUUsWUFBYyxLQUFNLFNBQVUsS0FBTTs7OztRQUl0QyxPQUNJLDBEQUNBLFdBQ0UsS0FBSyxPQUFPO1FBRWxCLElBQUksSUFBSSxjQUFjO1FBRU4sUUFBaEIsRUFBRSxPQUFPLE9BQVM7UUFDRCxRQUFqQixFQUFFLE9BQU8sR0FBRyxLQUFPO1FBQ0YsUUFBakIsRUFBRSxPQUFPLEdBQUcsS0FBTzs7OztRQUluQixPQUFPLGtEQUFrRCxLQUFLLE9BQU87UUFFckUsSUFBSSxJQUFJLGNBQWM7UUFFTCxRQUFqQixFQUFFLE9BQU8sR0FBRyxLQUFPOzs7Ozs7OztRQU1uQixLQUFJLE9BQVEsT0FBUSxVQUFZLFlBQWM7UUFFSSxRQUFsRCxPQUFPLGFBQWEsR0FBSSxNQUFPLE1BQU0sYUFBZTs7OztRQUlw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
//# sourceURL=../../kode/test/render.kode
