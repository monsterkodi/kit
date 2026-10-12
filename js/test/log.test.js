var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var commit, dated, record

import test from 'node:test'
import assert from 'node:assert/strict'
import git from "../git.js"

import render from "../render.js"

import theme from "../theme.js"

import style from "./style.js"


record = function (h, d, n, s)
{
    return `\0${h}\0${d}\0${n}\0${s}\0\n`
}
test('parseLog: reads one record per line',function ()
{
    var first, raw, second

    first = record('41f3542','Oct  1 23:53','Thorsten','a message')
    second = record('3421d42','Oct  1 23:49','Thorsten','another')
    raw = first + second
    return assert.deepEqual(git.parseLog(raw),[{hash:'41f3542',date:'Oct  1 23:53',name:'Thorsten',subject:'a message',body:'a message'},{hash:'3421d42',date:'Oct  1 23:49',name:'Thorsten',subject:'another',body:'another'}])
})
test('parseLog: no trailing newline on the last record',function ()
{
    var out, raw

    raw = record('aaa1111','Oct  1 23:53','Thorsten','only one').replace(/\n$/,'')
    out = git.parseLog(raw)
    assert.equal(out.length,1)
    return assert.equal(out[0].subject,'only one')
})
test('parseLog: empty input yields nothing',function ()
{
    assert.deepEqual(git.parseLog(''),[])
    return assert.deepEqual(git.parseLog('\n'),[])
})
test('parseLog: subject containing spaces and colons survives intact',function ()
{
    var out, subject

    subject = 'fix: handle empty tree and  spaces'
    out = git.parseLog(record('abc1234','Oct  1 23:53','Thorsten',subject))
    return assert.equal(out[0].subject,subject)
})
test('parseLog: unicode author and subject survive',function ()
{
    var out

    out = git.parseLog(record('abc1234','Jun 15 14:30','Zoë Müller','ünïcödé ✓'))
    assert.equal(out[0].name,'Zoë Müller')
    return assert.equal(out[0].subject,'ünïcödé ✓')
})
test('parseLog: no newline leaks into the next record hash',function ()
{
    var c, first, raw, second

    first = record('aaa1111','Oct  1 23:53','Thorsten','first')
    second = record('bbb2222','Oct  1 23:52','Thorsten','second')
    raw = first + second
    var list = _k_.list(git.parseLog(raw))
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        c = list[_a_]
        assert.ok(!c.hash.includes('\n'),'hash must not contain a newline')
        assert.ok(!c.date.includes('\n'))
        assert.ok(!c.name.includes('\n'))
    }
})
test('parseLog: a multi-line %B body stays with its own record',function ()
{
    var body, first, out, raw, second

    body = 'subject\n\nbody para one\nbody para one b\n\npara two'
    first = record('aaa1111','Oct  1 23:53','Thorsten',body)
    second = record('bbb2222','Oct  1 23:52','Thorsten','second')
    raw = first + second
    out = git.parseLog(raw)
    assert.equal(out.length,2,'both records survive')
    assert.equal(out[0].subject,body,'the body keeps its newlines and blank lines')
    return assert.equal(out[1].subject,'second','the following record is not polluted')
})
test('parseLog: a body containing a record separator does not break parsing',function ()
{
    var body, first, out, raw, second

    body = 'subject\n\nbody with \x1e inside'
    first = record('aaa1111','Oct  1 23:53','Thorsten',body)
    second = record('bbb2222','Oct  1 23:52','Thorsten','second')
    raw = first + second
    out = git.parseLog(raw)
    assert.equal(out.length,2)
    return assert.ok(out[0].subject.includes,'\x1e')
})
test('fitName: pads to exactly 8 characters',function ()
{
    assert.equal(render.NAME_WIDTH,8)
    assert.equal(render.fitName('Thorsten'),'Thorsten')
    assert.equal(render.fitName('opencode'),'opencode')
    assert.equal(render.fitName('zoe'),'zoe     ')
    return assert.equal(render.fitName('zoe').length,8)
})
test('fitName: crops names longer than 8',function ()
{
    assert.equal(render.fitName('Christopher'),'Christop')
    return assert.equal(render.fitName('Thorsten Kohnhorst'),'Thorsten')
})
test('fitName: handles empty and missing names',function ()
{
    assert.equal(render.fitName(''),'        ')
    return assert.equal(render.fitName(undefined),'        ')
})

commit = function (over = {})
{
    var base

    base = {hash:'abc1234',date:'Oct  1 23:53',name:'Thorsten',subject:'a message'}
    return Object.assign(base,over)
}
test('renderLog: one line per commit',function ()
{
    var out

    out = render.renderLog([commit(),commit({hash:'def5678',subject:'another'})],{theme:style.plainTheme})
    return assert.equal(out.split('\n').length,2)
})
test('renderLog: empty history renders nothing',function ()
{
    assert.equal(render.renderLog([],{theme:style.plainTheme}),'')
    return assert.equal(render.renderLog(null,{theme:style.plainTheme}),'')
})
test('renderLog: fields appear in order',function ()
{
    var out

    out = render.renderLog([commit()],{theme:style.plainTheme})
    return assert.equal(out,'abc1234 Oct  1 23:53 Thorsten a message')
})
test('renderLog: subject column aligns across rows regardless of name length',function ()
{
    var firstSubject, out, positions

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
    return assert.equal(positions[1],firstSubject)
})
test('renderLog: colours each column differently',function ()
{
    var codes, out

    out = render.renderLog([commit()],{theme:theme.createTheme(true)})
    codes = out.match(/\u001b\[38;5;\d+m/g).map(function (s)
    {
        return s.match(/\d+(?=m$)/)[0]
    })
    return assert.deepEqual(codes,['245','39','41'],'grey hash, blue date, green name')
})
test('renderLog: the same commit rendered plain has no escapes at all',function ()
{
    var out

    out = render.renderLog([commit()],{theme:theme.createTheme(false)})
    assert.doesNotMatch(out,/\u001b\[/,'a plain palette emits nothing')
    return assert.match(out,/a\x20message/,'and the subject is still there')
})
test('renderLog: subject is never truncated or recoloured',function ()
{
    var out, subject

    subject = 'fix: a long subject line that should be left completely alone'
    out = render.renderLog([commit({subject:subject})],{width:200})
    return assert.ok(out.endsWith(subject),'subject reaches the end of the line verbatim')
})

dated = function (...dates)
{
    return dates.map(function (date, i)
    {
        return commit({hash:'abc1234',date:date,subject:`m${i}`})
    })
}
test('collapseDates: the first date is always written out in full',function ()
{
    return assert.deepEqual(render.collapseDates(dated('Nov  9 00:00')),['Nov  9 00:00'])
})
test('collapseDates: a repeated day keeps only its time',function ()
{
    var out

    out = render.collapseDates(dated('Oct  1 14:00','Oct  1 15:00'))
    return assert.deepEqual(out,['Oct  1 14:00','       15:00'])
})
test('collapseDates: the same month on another day blanks the month alone',function ()
{
    var out

    out = render.collapseDates(dated('Oct  1 14:00','Oct  5 00:01'))
    return assert.deepEqual(out,['Oct  1 14:00','     5 00:01'])
})
test('collapseDates: a new month is written out in full again',function ()
{
    var out

    out = render.collapseDates(dated('Oct  9 12:00','Nov  9 00:00'))
    return assert.deepEqual(out,['Oct  9 12:00','Nov  9 00:00'],'the shared day 9 is not enough to carry the date forward')
})
test('collapseDates: a repeated day number is kept whole, not cut into the digits',function ()
{
    var out

    out = render.collapseDates(dated('Nov  9 00:00','Nov 10 10:10','Nov 13 12:11'))
    return assert.deepEqual(out,['Nov  9 00:00','    10 10:10','    13 12:11'])
})
test('collapseDates: the comparison is against the date above, not the line as printed',function ()
{
    var out

    out = render.collapseDates(dated('Oct  1 14:00','Oct  1 15:00','Oct  2 09:30'))
    return assert.deepEqual(out,['Oct  1 14:00','       15:00','     2 09:30'])
})
test('collapseDates: blanking is only ever spaces, so the width never moves',function ()
{
    var e, entries, out, raw

    raw = ['Oct  1 14:00','Oct  5 00:01','Nov  9 00:00','Nov 10 10:10']
    out = render.collapseDates(dated.apply(null,raw))
    entries = out.entries()
    var list = _k_.list(entries)
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        e = list[_b_]
        assert.equal(e[1].length,raw[e[0]].length)
    }
})
test('collapseDates: a run of commits across months and days',function ()
{
    var out

    out = render.collapseDates(dated('Oct  1 14:00','Oct  1 15:00','Oct  5 00:01','Oct  5 12:13','Oct  6 12:00','Oct  9 12:00','Nov  9 00:00','Nov 10 10:10','Nov 13 12:11'))
    return assert.deepEqual(out,['Oct  1 14:00','       15:00','     5 00:01','       12:13','     6 12:00','     9 12:00','Nov  9 00:00','    10 10:10','    13 12:11'])
})
test('renderLog: a repeated date is blanked on the line below',function ()
{
    var out

    out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:style.plainTheme})
    return assert.equal(out.split('\n')[1],'abc1234        15:00 Thorsten m1')
})
test('renderLog: blanking a date leaves the subject column where it was',function ()
{
    var columns, out

    out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00','Nov  9 00:00'),{theme:style.plainTheme})
    columns = out.split('\n').map(function (l)
    {
        return l.indexOf('Thorsten')
    })
    return assert.equal((new Set(columns)).size,1,'every line puts the name in the same column')
})
test('renderLog: -l writes every date out in full',function ()
{
    var out

    out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:style.plainTheme,long:true})
    return assert.equal(out.split('\n')[1],'abc1234 Oct  1 15:00 Thorsten m1')
})
test('renderLog: a blanked date is still coloured as one column',function ()
{
    var codes, out

    out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:theme.createTheme(true)})
    codes = out.split('\n')[1].match(/\u001b\[38;5;\d+m/g).map(function (s)
    {
        return s.match(/\d+(?=m$)/)[0]
    })
    return assert.deepEqual(codes,['245','39','41'],'grey hash, blue date, green name')
})
test('renderLog: the narrow layout blanks a repeated date too',function ()
{
    var out

    out = render.renderLog(dated('Oct  1 14:00','Oct  1 15:00'),{theme:style.plainTheme,width:50})
    return assert.match(out.split('\n')[2],/^abc1234\x20{8}15:00\x20Thorsten$/,'the date is blanked, the time is not')
})