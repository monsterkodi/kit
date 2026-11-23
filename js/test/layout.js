var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var bad, body, c, commit, cut, l, line, lines, long, LONG_SUBJECT, out, plain, r, short, t, w, widest, widths

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
    await section("a longer hash widens the prefix, and the message still ends at the width", async function ()
    {
        long = commit({hash:'f9c98c7a'})
        short = commit({hash:'a1b2c3d'})
        out = plain(render.renderLog([long,short],{width:100}))
        compare(widths(out),[100,100])
        matches(out.split('\n')[1],/^a1b2c3d\x20\x20/)
        out = plain(render.renderLog([commit({hash:'f9c98c7a',body:LONG_SUBJECT + ' ' + LONG_SUBJECT})],{width:100,long:true}))
        lines = out.split('\n')
        compare(lines[1].startsWith(' '.repeat(render.PREFIX_WIDTH + 1)),true)
        compare(lines[1][render.PREFIX_WIDTH + 1] !== ' ',true)
        compare(widest(out) <= 100,true)
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
    await section("a body is set off from the next commit by a blank line", async function ()
    {
        body = 'the subject\n\nthe body of the message'
        out = plain(render.renderLog([commit({subject:body,body:body}),commit({hash:'def5678'})],{width:80,long:true}))
        lines = out.split('\n')
        compare(lines[3],'')
        matches(lines[4],/^def5678\x20/)
    })
    await section("a message without a body gets no blank line", async function ()
    {
        out = plain(render.renderLog([commit({subject:'a message',body:'a message'}),commit({hash:'def5678',subject:'another',body:'another'})],{width:80,long:true}))
        compare(out.split('\n').length,2)
    })
    await section("the short layout leaves no blank line behind", async function ()
    {
        body = 'the subject\n\nthe body of the message'
        out = plain(render.renderLog([commit({subject:body,body:body}),commit({hash:'def5678'})],{width:80}))
        compare(out.split('\n').length,2)
    })
    await section("the last body is not followed by a blank line", async function ()
    {
        body = 'the subject\n\nthe body of the message'
        out = plain(render.renderLog([commit({subject:body,body:body})],{width:80,long:true}))
        compare(out.split('\n').length,3)
        compare(out.endsWith('\n'),false)
    })
}
toExport["long"]._section_ = true
toExport["the files of a commit"] = async function ()
{
    await section("they are listed under the subject column", async function ()
    {
        c = commit({files:[{code:'A',path:'src/new.mjs'},{code:'M',path:'README.md'}]})
        out = plain(render.renderLog([c],{width:80}))
        lines = out.split('\n')
        compare(lines.length,4)
        compare(lines[1],'')
        compare(lines[2],' '.repeat(render.PREFIX_WIDTH) + 'A src/new.mjs')
        compare(lines[3],' '.repeat(render.PREFIX_WIDTH) + 'M README.md')
    })
    await section("a rename keeps the name it came from", async function ()
    {
        c = commit({files:[{code:'R',path:'new.txt',orig:'old.txt'}]})
        out = plain(render.renderLog([c],{width:80}))
        matches(out,/R\x20new\.txt/)
        matches(out,/old\.txt/)
    })
    await section("they are set off from the next commit by a blank line", async function ()
    {
        c = commit({files:[{code:'A',path:'a.mjs'}]})
        out = plain(render.renderLog([c,commit({hash:'def5678'})],{width:80}))
        lines = out.split('\n')
        compare(lines[3],'')
        matches(lines[4],/^def5678\x20/)
    })
    await section("a commit without files has none", async function ()
    {
        out = plain(render.renderLog([commit()],{width:80}))
        compare(out.split('\n').length,1)
    })
    await section("the listing is below the body of a long message", async function ()
    {
        body = 'the subject\n\nthe body of the message'
        c = commit({subject:body,body:body,files:[{code:'A',path:'a.mjs'}]})
        out = plain(render.renderLog([c],{width:80,long:true}))
        lines = out.split('\n')
        compare(lines[2],' '.repeat(render.PREFIX_WIDTH) + 'the body of the message')
        compare(lines[3],'')
        compare(lines[4],' '.repeat(render.PREFIX_WIDTH) + 'A a.mjs')
    })
}
toExport["the files of a commit"]._section_ = true
toExport["parseArgs"] = async function ()
{
    await section("no arguments is short mode, whole history", async function ()
    {
        compare(log.parseArgs([]),{ok:true,count:null,long:false,files:false,paths:[]})
    })
    await section("a bare number is a commit count", async function ()
    {
        compare(log.parseArgs(['10']),{ok:true,count:10,long:false,files:false,paths:[]})
        compare(log.parseArgs(['0']),{ok:true,count:0,long:false,files:false,paths:[]})
    })
    await section("-l and --long both mean long mode", async function ()
    {
        compare(log.parseArgs(['-l']),{ok:true,count:null,long:true,files:false,paths:[]})
        compare(log.parseArgs(['--long']),{ok:true,count:null,long:true,files:false,paths:[]})
    })
    await section("the flag and a count combine in either order", async function ()
    {
        compare(log.parseArgs(['-l','5']),{ok:true,count:5,long:true,files:false,paths:[]})
        compare(log.parseArgs(['5','-l']),{ok:true,count:5,long:true,files:false,paths:[]})
        compare(log.parseArgs(['5','--long']),{ok:true,count:5,long:true,files:false,paths:[]})
    })
    await section("-f and --files ask for the files of a commit", async function ()
    {
        compare(log.parseArgs(['-f']),{ok:true,count:null,long:false,files:true,paths:[]})
        compare(log.parseArgs(['--files']),{ok:true,count:null,long:false,files:true,paths:[]})
    })
    await section("everything behind -f belongs to the diff", async function ()
    {
        compare(log.parseArgs(['-f','.kode']),{ok:true,count:null,long:false,files:true,paths:['.kode']})
        compare(log.parseArgs(['5','-f','kode','src/a.mjs']),{ok:true,count:5,long:false,files:true,paths:['kode','src/a.mjs']})
    })
    await section("the count is the log's, wherever it stands", async function ()
    {
        compare(log.parseArgs(['-f','5']),{ok:true,count:5,long:false,files:true,paths:[]})
        compare(log.parseArgs(['-f','5','.kode']),{ok:true,count:5,long:false,files:true,paths:['.kode']})
    })
    await section("the flags of the log are the flags of the log, wherever they stand", async function ()
    {
        compare(log.parseArgs(['-f','-l']),{ok:true,count:null,long:true,files:true,paths:[]})
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvbGF5b3V0LmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7O09BWU8sYUFBQTs7OztPQUVELGNBQUE7SUFBVTtJQUFROzs7QUFFeEIsa0JBQVM7O1dBQU0sRUFBRSxRQUFRLG9CQUFxQjs7O0FBQzlDLG1CQUFVOztXQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sY0FBSzs7ZUFBTSxPQUFPLGFBQWE7OztBQUVwRSxlQUFlOztBQUVmLG1CQUFVOzs7O0lBRU4sUUFDSSxLQUFNLFVBQ04sS0FBTSxlQUNOLEtBQU0sV0FDTixRQUFTLGFBQ1QsS0FBTTtXQUVWLE9BQU8sT0FBTyxLQUFNOzs7QUFFeEIsbUJBQVU7O1dBQU0sS0FBSyxJQUFJLE1BQU0sS0FBTSxPQUFPOzs7Ozs7UUFNaEIsUUFBcEIsT0FBTyxhQUFlO1FBRXRCLE9BQU8sTUFBTSxPQUFPLFdBQVcsUUFBUSxRQUFTLFFBQVMsTUFBTztRQUV0QyxRQUExQixPQUFPLGFBQWEsTUFBUSxPQUFPLGVBQWU7Ozs7UUFJbEQsT0FBUSxRQUFRLEtBQU07UUFDdEIsUUFBUSxRQUFRLEtBQU07UUFFdEIsTUFBTSxNQUFNLE9BQU8sV0FBVyxLQUFNLFFBQVMsTUFBTztRQUN4QyxRQUFaLE9BQU8sTUFBUSxJQUFJO1FBQ25CLFFBQVEsSUFBSSxNQUFNLE1BQU0sR0FBSTtRQUU1QixNQUFNLE1BQU0sT0FBTyxXQUFXLFFBQVEsS0FBTSxXQUFZLEtBQU0sZUFBZSxNQUFNLGlCQUFrQixNQUFPLElBQUssS0FBTTtRQUN2SCxRQUFRLElBQUksTUFBTTtRQUN1QyxRQUF6RCxNQUFNLEdBQUcsV0FBVyxJQUFJLE9BQU8sT0FBTyxlQUFlLElBQU07UUFDbEIsUUFBekMsTUFBTSxHQUFHLE9BQU8sZUFBZSxPQUFNLElBQU07UUFDeEIsUUFBbkIsT0FBTyxRQUFRLElBQU07Ozs7UUFJckIsTUFBTSxNQUFNLE9BQU8sV0FBVyxRQUFRLFFBQVMsZ0JBQWlCLE1BQU87UUFFdkUs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
//# sourceURL=../../kode/test/layout.kode
