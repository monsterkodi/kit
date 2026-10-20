var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var body, bodyGreys, c, codes, columns, commit, dated, e, entries, first, firstSubject, g, greys, out, positions, raw, record, second, subject

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

bodyGreys = function (out)
{
    var codes, found, l, _44_48_

    codes = []
    var list = _k_.list(out.split('\n'))
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        l = list[_a_]
        found = ((_44_48_=l.match(/\u001b\[38;5;(\d+)m/g)) != null ? _44_48_ : [])
        if (found.length === 1)
        {
            codes.push(Number(found[0].match(/\d+(?=m$)/)[0]))
        }
    }
    return codes
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
        for (var _b_ = 0; _b_ < list.length; _b_++)
        {
            c = list[_b_]
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
toExport["the long body gradient"] = async function ()
{
    await section("the body of a long message fades from light to dark", async function ()
    {
        body = 'the subject\n\nfirst line of the body\nsecond line of the body'
        out = render.renderLog([commit({subject:body,body:body})],{width:80,long:true,theme:theme.createTheme(true)})
        greys = bodyGreys(out)
        compare(greys.length,2)
        compare(greys[0] > greys[1],true)
    })
    await section("the fade walks the greys of the palette, never out of them", async function ()
    {
        body = 'the subject\n\nfirst line of the body\nsecond line of the body'
        out = render.renderLog([commit({subject:body,body:body})],{width:80,long:true,theme:theme.createTheme(true)})
        var list1 = _k_.list(bodyGreys(out))
        for (var _c_ = 0; _c_ < list1.length; _c_++)
        {
            g = list1[_c_]
            compare(g >= 232,true)
            compare(g <= 255,true)
        }
    })
    await section("the title keeps the colour of the column it stands in", async function ()
    {
        out = render.renderLog([commit({subject:'a message'})],{width:80,long:true,theme:theme.createTheme(true)})
        codes = out.split('\n')[0].match(/\u001b\[38;5;\d+m/g).map(function (s)
        {
            return s.match(/\d+(?=m$)/)[0]
        })
        compare(codes,['245','39','41'])
    })
    await section("a message without a body has no grey at all", async function ()
    {
        out = render.renderLog([commit({subject:'a message'})],{width:80,long:true,theme:theme.createTheme(true)})
        compare(bodyGreys(out).length,0)
    })
    await section("every commit fades on its own", async function ()
    {
        body = 'the subject\n\nfirst line of the body\nsecond line of the body'
        out = render.renderLog([commit({subject:body,body:body}),commit({hash:'def5678',subject:body,body:body})],{width:80,long:true,theme:theme.createTheme(true)})
        greys = bodyGreys(out)
        compare(greys.length,4)
        compare(greys[0] > greys[1],true)
        compare(greys[2] > greys[3],true)
        compare(greys[0] === greys[2],true)
    })
    await section("a blank line in the body takes no step of the fade", async function ()
    {
        body = 'the subject\n\nfirst line of the body\n\nsecond line of the body'
        out = render.renderLog([commit({subject:body,body:body})],{width:80,long:true,theme:theme.createTheme(true)})
        greys = bodyGreys(out)
        compare(greys.length,2)
        compare(greys[0] > greys[1],true)
    })
    await section("the plain palette leaves the body alone", async function ()
    {
        body = 'the subject\n\nfirst line of the body\nsecond line of the body'
        out = render.renderLog([commit({subject:body,body:body})],{width:80,long:true,theme:style.plainTheme})
        notMatches(out,/\u001b\[/)
        matches(out,/first\x20line\x20of\x20the\x20body/)
    })
}
toExport["the long body gradient"]._section_ = true
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
        var list2 = _k_.list(entries)
        for (var _d_ = 0; _d_ < list2.length; _d_++)
        {
            e = list2[_d_]
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvbG9nLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTs7Z0JBQThCLE1BQU0sTUFBTSxNQUFNOzs7QUFFaEQ7Ozs7SUFFSSxRQUNJLEtBQU0sVUFDTixLQUFNLGVBQ04sS0FBTSxXQUNOLFFBQVM7V0FFYixPQUFPLE9BQU8sS0FBTTs7O0FBRXhCOztXQUVJLE1BQU07O2VBQWlCLFFBQVEsS0FBTSxVQUFXLEtBQUEsS0FBTSxZQUFhOzs7O0FBTXZFOzs7O0lBRUk7d0JBRVMsSUFBSSxNQUFNOzs7O1FBQ2Ysa0JBQVEsRUFBRSxNQUFNO1lBQ2IsTUFBTSxXQUFVOztZQUFPLE1BQU0sS0FBSyxPQUFPLE1BQU0sR0FBRyxNQUFNLGFBQWE7OztXQUU1RTs7Ozs7O1FBTUksUUFBUSxPQUFPLFVBQVcsZUFBZ0IsV0FBWTtRQUN0RCxTQUFTLE9BQU8sVUFBVyxlQUFnQixXQUFZO1FBQ3ZELE1BQU0sUUFBUTtnQkFFZCxJQUFJLFNBQVMsT0FDUixLQUFNLFVBQVcsS0FBTSxlQUFnQixLQUFNLFdBQVksUUFBUyxZQUFhLEtBQU0sY0FDckYsS0FBTSxVQUFXLEtBQU0sZUFBZ0IsS0FBTSxXQUFZLFFBQVMsVUFBVyxLQUFNOzs7O1FBS3hGLE1BQU0sT0FBTyxVQUFXLGVBQWdCLFdBQVksWUFBWSxRQUFRLE1BQU87UUFDL0UsTUFBTSxJQUFJLFNBQVM7Z0JBRW5CLElBQUksT0FBUztnQkFDYixJQUFJLEdBQUcsUUFBVTs7OztnQkFJakIsSUFBSSxTQUFTO2dCQUNiLElBQUksU0FBUzs7OztRQUliLFVBQVU7UUFDVixNQUFNLElBQUksU0FBUyxPQUFPLFVBQVcsZUFBZ0IsV0FBWTtnQkFFakUsSUFBSSxHQUFHLFFBQVU7Ozs7UUFJakIsTUFBTSxJQUFJLFNBQVMsT0FBTyxVQUFXLGVBQWdCLGFBQWM7Z0JBRW5FLElBQUksR0FBRyxLQUFPO2dCQUNkLElBQUksR0FBRyxRQUFVOzs7O1FBSWpC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
//# sourceURL=file:///home/kodi/s/kit/kode/test/log.kode
