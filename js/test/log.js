var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var body, c, codes, columns, commit, dated, e, entries, first, firstSubject, out, positions, raw, record, second, subject

import git from "../git.js"

import render from "../render.js"

import theme from "../theme.js"

import style from "./style.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches


record = function (h, d, n, s)
{
    return `\0${h}\0${d}\0${n}\0${s}\0\n`
}

commit = function (over = {})
{
    var base

    base = {hash:'abc1234',date:'Oct  1 23:53',name:'Thorsten',subject:'a message'}
    return Object.assign(base,over)
}

dated = function (...dates)
{
    return dates.map(function (date, i)
    {
        return commit({hash:'abc1234',date:date,subject:`m${i}`})
    })
}
toExport["parseLog"] = async function ()
{
    await section("reads one record per line", async function ()
    {
        first = record('41f3542','Oct  1 23:53','Thorsten','a message')
        second = record('3421d42','Oct  1 23:49','Thorsten','another')
        raw = first + second
        compare(git.parseLog(raw),[{hash:'41f3542',date:'Oct  1 23:53',name:'Thorsten',subject:'a message',body:'a message'},{hash:'3421d42',date:'Oct  1 23:49',name:'Thorsten',subject:'another',body:'another'}])
    })
    await section("no trailing newline on the last record", async function ()
    {
        raw = record('aaa1111','Oct  1 23:53','Thorsten','only one').replace(/\n$/,'')
        out = git.parseLog(raw)
        compare(out.length,1)
        compare(out[0].subject,'only one')
    })
    await section("empty input yields nothing", async function ()
    {
        compare(git.parseLog(''),[])
        compare(git.parseLog('\n'),[])
    })
    await section("subject containing spaces and colons survives intact", async function ()
    {
        subject = 'fix: handle empty tree and  spaces'
        out = git.parseLog(record('abc1234','Oct  1 23:53','Thorsten',subject))
        compare(out[0].subject,subject)
    })
    await section("unicode author and subject survive", async function ()
    {
        out = git.parseLog(record('abc1234','Jun 15 14:30','Zoë Müller','ünïcödé ✓'))
        compare(out[0].name,'Zoë Müller')
        compare(out[0].subject,'ünïcödé ✓')
    })
    await section("no newline leaks into the next record hash", async function ()
    {
        first = record('aaa1111','Oct  1 23:53','Thorsten','first')
        second = record('bbb2222','Oct  1 23:52','Thorsten','second')
        raw = first + second
        var list = _k_.list(git.parseLog(raw))
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            c = list[_a_]
            compare(!c.hash.includes('\n'),true)
            compare(!c.date.includes('\n'),true)
            compare(!c.name.includes('\n'),true)
        }
    })
    await section("a multi-line %B body stays with its own record", async function ()
    {
        body = 'subject\n\nbody para one\nbody para one b\n\npara two'
        first = record('aaa1111','Oct  1 23:53','Thorsten',body)
        second = record('bbb2222','Oct  1 23:52','Thorsten','second')
        raw = first + second
        out = git.parseLog(raw)
        compare(out.length,2)
        compare(out[0].subject,body)
        compare(out[1].subject,'second')
    })
    await section("a body containing a record separator does not break parsing", async function ()
    {
        body = 'subject\n\nbody with \x1e inside'
        first = record('aaa1111','Oct  1 23:53','Thorsten',body)
        second = record('bbb2222','Oct  1 23:52','Thorsten','second')
        raw = first + second
        out = git.parseLog(raw)
        compare(out.length,2)
        compare(out[0].subject.includes('\x1e'),true)
    })
}
toExport["parseLog"]._section_ = true
toExport["fitName"] = async function ()
{
    await section("pads to exactly 8 characters", async function ()
    {
        compare(render.NAME_WIDTH,8)
        compare(render.fitName('Thorsten'),'Thorsten')
        compare(render.fitName('opencode'),'opencode')
        compare(render.fitName('zoe'),'zoe     ')
        compare(render.fitName('zoe').length,8)
    })
    await section("crops names longer than 8", async function ()
    {
        compare(render.fitName('Christopher'),'Christop')
        compare(render.fitName('Thorsten Kohnhorst'),'Thorsten')
    })
    await section("handles empty and missing names", async function ()
    {
        compare(render.fitName(''),'        ')
        compare(render.fitName(undefined),'        ')
    })
}
toExport["fitName"]._section_ = true
toExport["renderLog"] = async function ()
{
    await section("one line per commit", async function ()
    {
        out = render.renderLog([commit(),commit({hash:'def5678',subject:'another'})],{theme:style.plainTheme})
        compare(out.split('\n').length,2)
    })
    await section("empty history renders nothing", async function ()
    {
        compare(render.renderLog([],{theme:style.plainTheme}),'')
        compare(render.renderLog(null,{theme:style.plainTheme}),'')
    })
    await section("fields appear in order", async function ()
    {
        out = render.renderLog([commit()],{theme:style.plainTheme})
        compare(out,'abc1234 Oct  1 23:53 Thorsten a message')
    })
    await section("subject column aligns across rows regardless of name length", async function ()
    {
        out = render.renderLog([commit({name:'Thorsten',subject:'long-ish subject'}),commit({name:'zoe',subject:'x'})],{theme:style.plainTheme})
        positions = out.split('\n').map(function (l)
        {
            if (l.indexOf('x') >= 0)
            {
                return l.indexOf('x')
            }
            else
            {
                return -1
            }
        })
        firstSubject = out.split('\n')[0].indexOf('long-ish subject')
        compare(positions[1],firstSubject)
    })
    await section("colours each column differently", async function ()
    {
        out = render.renderLog([commit()],{theme:theme.createTheme(true)})
        codes = out.match(/\u001b\[38;5;\d+m/g).map(function (s)
        {
            return s.match(/\d+(?=m$)/)[0]
        })
        compare(codes,['245','39','41'])
    })
    await section("the same commit rendered plain has no escapes at all", async function ()
    {
        out = render.renderLog([commit()],{theme:theme.createTheme(false)})
        notMatches(out,/\u001b\[/)
        matches(out,/a\x20message/)
    })
    await section("subject is never truncated or recoloured", async function ()
    {
        subject = 'fix: a long subject line that should be left completely alone'
        out = render.renderLog([commit({subject:subject})],{width:200})
        compare(out.endsWith(subject),true)
    })
    await section("a repeated date is blanked on the line below", async function ()
    {
        out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:style.plainTheme})
        compare(out.split('\n')[1],'abc1234        15:00 Thorsten m1')
    })
    await section("blanking a date leaves the subject column where it was", async function ()
    {
        out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00','Nov  9 00:00'),{theme:style.plainTheme})
        columns = out.split('\n').map(function (l)
        {
            return l.indexOf('Thorsten')
        })
        compare((new Set(columns)).size,1)
    })
    await section("-l writes every date out in full", async function ()
    {
        out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:style.plainTheme,long:true})
        compare(out.split('\n')[1],'abc1234 Oct  1 15:00 Thorsten m1')
    })
    await section("a blanked date is still coloured as one column", async function ()
    {
        out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:theme.createTheme(true)})
        codes = out.split('\n')[1].match(/\u001b\[38;5;\d+m/g).map(function (s)
        {
            return s.match(/\d+(?=m$)/)[0]
        })
        compare(codes,['245','39','41'])
    })
    await section("the narrow layout blanks a repeated date too", async function ()
    {
        out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:style.plainTheme,width:50})
        matches(out.split('\n')[2],/^abc1234\x20{8}15:00\x20Thorsten$/)
    })
}
toExport["renderLog"]._section_ = true
toExport["collapseDates"] = async function ()
{
    await section("the first date is always written out in full", async function ()
    {
        compare(render.collapseDates(dated('Nov  9 00:00')),['Nov  9 00:00'])
    })
    await section("a repeated day keeps only its time", async function ()
    {
        out = render.collapseDates(dated('Oct  1 14:00','Oct  1 15:00'))
        compare(out,['Oct  1 14:00','       15:00'])
    })
    await section("the same month on another day blanks the month alone", async function ()
    {
        out = render.collapseDates(dated('Oct  1 14:00','Oct  5 00:01'))
        compare(out,['Oct  1 14:00','     5 00:01'])
    })
    await section("a new month is written out in full again", async function ()
    {
        out = render.collapseDates(dated('Oct  9 12:00','Nov  9 00:00'))
        compare(out,['Oct  9 12:00','Nov  9 00:00'])
    })
    await section("a repeated day number is kept whole, not cut into the digits", async function ()
    {
        out = render.collapseDates(dated('Nov  9 00:00','Nov 10 10:10','Nov 13 12:11'))
        compare(out,['Nov  9 00:00','    10 10:10','    13 12:11'])
    })
    await section("the comparison is against the date above, not the line as printed", async function ()
    {
        out = render.collapseDates(dated('Oct  1 14:00','Oct  1 15:00','Oct  2 09:30'))
        compare(out,['Oct  1 14:00','       15:00','     2 09:30'])
    })
    await section("blanking is only ever spaces, so the width never moves", async function ()
    {
        raw = ['Oct  1 14:00','Oct  5 00:01','Nov  9 00:00','Nov 10 10:10']
        out = render.collapseDates(dated.apply(null,raw))
        entries = out.entries()
        var list1 = _k_.list(entries)
        for (var _b_ = 0; _b_ < list1.length; _b_++)
        {
            e = list1[_b_]
            compare(e[1].length,raw[e[0]].length)
        }
    })
    await section("a run of commits across months and days", async function ()
    {
        out = render.collapseDates(dated('Oct  1 14:00','Oct  1 15:00','Oct  5 00:01','Oct  5 12:13','Oct  6 12:00','Oct  9 12:00','Nov  9 00:00','Nov 10 10:10','Nov 13 12:11'))
        compare(out,['Oct  1 14:00','       15:00','     5 00:01','       12:13','     6 12:00','     9 12:00','Nov  9 00:00','    10 10:10','    13 12:11'])
    })
}
toExport["collapseDates"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvbG9nLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTs7Z0JBQThCLE1BQU0sTUFBTSxNQUFNOzs7QUFFaEQ7Ozs7SUFFSSxRQUNJLEtBQU0sVUFDTixLQUFNLGVBQ04sS0FBTSxXQUNOLFFBQVM7V0FFYixPQUFPLE9BQU8sS0FBTTs7O0FBRXhCOztXQUVJLE1BQU07O2VBQWlCLFFBQVEsS0FBTSxVQUFXLEtBQUEsS0FBTSxZQUFhOzs7Ozs7O1FBTS9ELFFBQVEsT0FBTyxVQUFXLGVBQWdCLFdBQVk7UUFDdEQsU0FBUyxPQUFPLFVBQVcsZUFBZ0IsV0FBWTtRQUN2RCxNQUFNLFFBQVE7Z0JBRWQsSUFBSSxTQUFTLE9BQ1IsS0FBTSxVQUFXLEtBQU0sZUFBZ0IsS0FBTSxXQUFZLFFBQVMsWUFBYSxLQUFNLGNBQ3JGLEtBQU0sVUFBVyxLQUFNLGVBQWdCLEtBQU0sV0FBWSxRQUFTLFVBQVcsS0FBTTs7OztRQUt4RixNQUFNLE9BQU8sVUFBVyxlQUFnQixXQUFZLFlBQVksUUFBUSxNQUFPO1FBQy9FLE1BQU0sSUFBSSxTQUFTO2dCQUVuQixJQUFJLE9BQVM7Z0JBQ2IsSUFBSSxHQUFHLFFBQVU7Ozs7Z0JBSWpCLElBQUksU0FBUztnQkFDYixJQUFJLFNBQVM7Ozs7UUFJYixVQUFVO1FBQ1YsTUFBTSxJQUFJLFNBQVMsT0FBTyxVQUFXLGVBQWdCLFdBQVk7Z0JBRWpFLElBQUksR0FBRyxRQUFVOzs7O1FBSWpCLE1BQU0sSUFBSSxTQUFTLE9BQU8sVUFBVyxlQUFnQixhQUFjO2dCQUVuRSxJQUFJLEdBQUcsS0FBTztnQkFDZCxJQUFJLEdBQUcsUUFBVTs7OztRQUlqQixRQUFRLE9BQU8sVUFBVyxlQUFnQixXQUFZO1FBQ3RELFNBQVMsT0FBTyxVQUFXLGVBQWdCLFdBQVk7UUFDdkQsTUFBTSxRQUFROzRCQUVMLElBQUksU0FBUzs7OztxQkFDZCxFQUFFLEtBQUssU0FBUyxNQUFR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
//# sourceURL=file:///home/kodi/s/kit/kode/test/log.kode
