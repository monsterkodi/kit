var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var bad, body, commit, cut, l, line, lines, long, LONG_SUBJECT, out, plain, r, short, t, w, widest, widths

import render from "../render.js"

import log from "../log.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches


plain = function (s)
{
    return s.replace(/\u001b\[[0-9;]*m/g,'')
}

widths = function (s)
{
    return plain(s).split('\n').map(function (l)
    {
        return render.displayWidth(l)
    })
}
LONG_SUBJECT = 'AGENTS.md: replace rules satisfiable by sounding thoughtful with checkable ones'

commit = function (over = {})
{
    var base

    base = {hash:'f9c98c7',date:'Oct  1 04:32',name:'opencode',subject:LONG_SUBJECT,body:LONG_SUBJECT}
    return Object.assign(base,over)
}

widest = function (s)
{
    return Math.max.apply(null,widths(s))
}
toExport["width"] = async function ()
{
    await section("PREFIX_WIDTH matches the real rendered prefix", async function ()
    {
        compare(render.PREFIX_WIDTH,30)
        line = plain(render.renderLog([commit({subject:'x'})],{width:100}))
        compare(render.displayWidth(line),render.PREFIX_WIDTH + 1)
    })
    await section("a short subject is left untouched", async function ()
    {
        out = plain(render.renderLog([commit({subject:'short one'})],{width:100}))
        matches(out,/short\x20one$/)
        compare(!out.includes('…'),true)
    })
    await section("a long subject is truncated to the width", async function ()
    {
        out = plain(render.renderLog([commit()],{width:100}))
        compare(widest(out),100)
        compare(out.includes('…'),true)
        compare(out.includes('AGENTS.md:'),true)
    })
    await section("output never exceeds the width when the budget allows", async function ()
    {
        var list = [70,80,90,100,111,120,160,190]
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            w = list[_a_]
            out = plain(render.renderLog([commit()],{width:w}))
            compare(widest(out) <= w,true)
        }
    })
    await section("below the minimum message width, the message is left long rather than mangled", async function ()
    {
        compare(render.NARROW_WIDTH,60)
        compare(render.MIN_MESSAGE_WIDTH,40)
        out = plain(render.renderLog([commit()],{width:65}))
        compare(widest(out),render.PREFIX_WIDTH + LONG_SUBJECT.length)
        compare(!out.includes('…'),true)
        compare(out.includes(LONG_SUBJECT),true)
    })
    await section("the narrow layout never overflows, even at absurd widths", async function ()
    {
        var list1 = [30,40,50,59]
        for (var _b_ = 0; _b_ < list1.length; _b_++)
        {
            w = list1[_b_]
            out = plain(render.renderLog([commit()],{width:w}))
            compare(widest(out) <= w,true)
        }
    })
    await section("below NARROW_WIDTH the message goes on its own line", async function ()
    {
        out = plain(render.renderLog([commit({subject:'a message here'})],{width:50}))
        lines = out.split('\n')
        compare(lines.length,2)
        matches(lines[0],/^f9c98c7\x20Oct\x20{2}1\x2004:32\x20opencode$/)
        matches(lines[1],/^\x20{2}a\x20message\x20here$/)
    })
    await section("the narrow layout still truncates a long message", async function ()
    {
        out = plain(render.renderLog([commit()],{width:50}))
        compare(out.includes('…'),true)
        compare(widest(out) <= 50,true)
    })
}
toExport["width"]._section_ = true
toExport["truncate"] = async function ()
{
    await section("leaves short text alone and marks the cut otherwise", async function ()
    {
        compare(render.truncate('short',20),'short')
        cut = render.truncate('abcdefghij',5)
        compare(cut,'abcd…')
        compare(render.displayWidth(cut),5)
    })
    await section("the ellipsis is a single glyph, not three dots", async function ()
    {
        compare(render.truncate('abcdefghij',5).endsWith('…'),true)
        compare(!render.truncate('abcdefghij',5).endsWith('...'),true)
    })
    await section("displayWidth counts an em-dash as one column, not two bytes", async function ()
    {
        compare(render.displayWidth('a—b'),3)
        compare(render.displayWidth('…'),1)
        compare(render.displayWidth(''),0)
    })
    await section("truncation accounts for multi-byte characters", async function ()
    {
        t = render.truncate('aa—bb—cc—dd',6)
        compare(render.displayWidth(t),6)
    })
}
toExport["truncate"]._section_ = true
toExport["wrap"] = async function ()
{
    await section("breaks on spaces and respects the width", async function ()
    {
        lines = render.wrap('the quick brown fox jumps over the lazy dog',15)
        var list2 = _k_.list(lines)
        for (var _c_ = 0; _c_ < list2.length; _c_++)
        {
            l = list2[_c_]
            compare(render.displayWidth(l) <= 15,true)
        }
        compare(lines.join(' '),'the quick brown fox jumps over the lazy dog')
    })
    await section("preserves blank lines between paragraphs", async function ()
    {
        lines = render.wrap('one\n\ntwo',20)
        compare(lines,['one','','two'])
    })
    await section("hard-splits a word longer than the width", async function ()
    {
        lines = render.wrap(('x'.repeat(25)),10)
        compare(lines.length,3)
        var list3 = _k_.list(lines)
        for (var _d_ = 0; _d_ < list3.length; _d_++)
        {
            l = list3[_d_]
            compare(render.displayWidth(l) <= 10,true)
        }
        compare(lines.join('').length,25)
    })
}
toExport["wrap"]._section_ = true
toExport["long"] = async function ()
{
    await section("--long indents continuation lines under the subject column", async function ()
    {
        out = plain(render.renderLog([commit()],{width:80,long:true}))
        lines = out.split('\n')
        compare(lines.length > 1,true)
        var list4 = _k_.list(lines.slice(1))
        for (var _e_ = 0; _e_ < list4.length; _e_++)
        {
            l = list4[_e_]
            compare(l.startsWith(' '.repeat(render.PREFIX_WIDTH)),true)
        }
        compare(widest(out) <= 80,true)
    })
    await section("--long keeps a blank paragraph break, without trailing spaces on it", async function ()
    {
        body = 'subject\n\nfirst para\n\nsecond para'
        out = plain(render.renderLog([commit({subject:body,body:body})],{width:80,long:true}))
        compare(out.includes('\n\n'),true)
        var list5 = _k_.list(out.split('\n'))
        for (var _f_ = 0; _f_ < list5.length; _f_++)
        {
            line = list5[_f_]
            compare(line,line.replace(/\s+$/,''))
        }
    })
    await section("--long shows more than the subject alone", async function ()
    {
        body = 'the subject\n\nA body paragraph that git log --oneline would hide.'
        short = plain(render.renderLog([commit({subject:body,body:body})],{width:80}))
        long = plain(render.renderLog([commit({subject:body,body:body})],{width:80,long:true}))
        compare(long.includes('A body paragraph'),true)
        compare(!short.includes('A body paragraph'),true)
    })
}
toExport["long"]._section_ = true
toExport["parseArgs"] = async function ()
{
    await section("no arguments is short mode, whole history", async function ()
    {
        compare(log.parseArgs([]),{ok:true,count:null,long:false})
    })
    await section("a bare number is a commit count", async function ()
    {
        compare(log.parseArgs(['10']),{ok:true,count:10,long:false})
        compare(log.parseArgs(['0']),{ok:true,count:0,long:false})
    })
    await section("-l and --long both mean long mode", async function ()
    {
        compare(log.parseArgs(['-l']),{ok:true,count:null,long:true})
        compare(log.parseArgs(['--long']),{ok:true,count:null,long:true})
    })
    await section("the flag and a count combine in either order", async function ()
    {
        compare(log.parseArgs(['-l','5']),{ok:true,count:5,long:true})
        compare(log.parseArgs(['5','-l']),{ok:true,count:5,long:true})
        compare(log.parseArgs(['5','--long']),{ok:true,count:5,long:true})
    })
    await section("bad arguments are rejected, not silently ignored", async function ()
    {
        var list6 = [['foo'],['-x'],['1.5'],['']]
        for (var _10_ = 0; _10_ < list6.length; _10_++)
        {
            bad = list6[_10_]
            r = log.parseArgs(bad)
            compare(r.ok,false)
            matches(r.message,/not\x20a\x20commit\x20count/)
        }
    })
    await section("more than one count is an error", async function ()
    {
        r = log.parseArgs(['1','2'])
        compare(r.ok,false)
        matches(r.message,/at\x20most\x20one/)
    })
}
toExport["parseArgs"]._section_ = true
toExport["terminalWidth"] = async function ()
{
    await section("uses the stream width when it is a real terminal", async function ()
    {
        compare(log.terminalWidth({columns:120}),120)
        compare(log.terminalWidth({columns:40}),40)
    })
    await section("falls back when the value is unusable", async function ()
    {
        var list7 = [undefined,null,0,-1,NaN,'80']
        for (var _11_ = 0; _11_ < list7.length; _11_++)
        {
            bad = list7[_11_]
            compare(log.terminalWidth({columns:bad}),render.DEFAULT_WIDTH)
        }
        compare(render.DEFAULT_WIDTH,80)
    })
}
toExport["terminalWidth"]._section_ = true
toExport["fitName"] = async function ()
{
    await section("still pads or crops to 8", async function ()
    {
        compare(render.fitName('Thorsten'),'Thorsten')
        compare(render.fitName('zoe'),'zoe     ')
        compare(render.fitName('Christopher'),'Christop')
    })
}
toExport["fitName"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvbGF5b3V0LmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztXQUFlLEVBQUUsUUFBUSxvQkFBcUI7OztBQUM5Qzs7V0FBZ0IsTUFBTSxHQUFHLE1BQU0sTUFBTTs7ZUFBVyxPQUFPLGFBQWE7OztBQUVwRSxlQUFlOztBQUVmOzs7O0lBRUksUUFDSSxLQUFNLFVBQ04sS0FBTSxlQUNOLEtBQU0sV0FDTixRQUFTLGFBQ1QsS0FBTTtXQUVWLE9BQU8sT0FBTyxLQUFNOzs7QUFFeEI7O1dBQWdCLEtBQUssSUFBSSxNQUFNLEtBQU0sT0FBTzs7Ozs7O2dCQU1wQyxPQUFPLGFBQWU7UUFFdEIsT0FBTyxNQUFNLE9BQU8sV0FBVyxRQUFRLFFBQVMsUUFBUyxNQUFPO2dCQUVoRSxPQUFPLGFBQWEsTUFBUSxPQUFPLGVBQWU7Ozs7UUFJbEQsTUFBTSxNQUFNLE9BQU8sV0FBVyxRQUFRLFFBQVMsZ0JBQWlCLE1BQU87UUFFdkUsUUFBUSxJQUFLO2lCQUNULElBQUksU0FBUyxLQUFPOzs7O1FBSXhCLE1BQU0sTUFBTSxPQUFPLFdBQVcsV0FBWSxNQUFPO2dCQUVqRCxPQUFPLEtBQU87Z0JBQ2QsSUFBSSxTQUFTLEtBQU87Z0JBQ3BCLElBQUksU0FBUyxjQUFnQjs7OztvQkFJbkIsR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSTs7OztZQUMvQixNQUFNLE1BQU0sT0FBTyxXQUFXLFdBQVksTUFBTztvQkFDakQsT0FBTyxRQUFRLEVBQUk7Ozs7O2dCQUl2QixPQUFPLGFBQWU7Z0JBQ3RCLE9BQU8sa0JBQW9CO1FBRTNCLE1BQU0sTUFBTSxPQUFPLFdBQVcsV0FBWSxNQUFPO2dCQUVqRCxPQUFPLEtBQU8sT0FBTyxlQUFlLGFBQWE7aUJBQzdDLElBQUksU0FBUyxLQUFPO2dCQUN4QixJQUFJLFNBQVMsY0FBZ0I7Ozs7cUJBSW5CLEdBQUcsR0FBRyxHQUFHOzs7O1lBQ2YsTUFB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
//# sourceURL=file:///home/kodi/s/kit/kode/test/layout.kode
