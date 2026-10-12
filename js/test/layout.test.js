var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var commit, LONG_SUBJECT, plain, widest, widths

import test from 'node:test'
import assert from 'node:assert/strict'
import render from "../render.js"

import log from "../log.js"


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
test('PREFIX_WIDTH matches the real rendered prefix',function ()
{
    var line

    assert.equal(render.PREFIX_WIDTH,30)
    line = plain(render.renderLog([commit({subject:'x'})],{width:100}))
    return assert.equal(render.displayWidth(line),render.PREFIX_WIDTH + 1)
})
test('a short subject is left untouched',function ()
{
    var out

    out = plain(render.renderLog([commit({subject:'short one'})],{width:100}))
    assert.match(out,/short\x20one$/)
    return assert.ok(!out.includes('…'))
})
test('truncate: leaves short text alone and marks the cut otherwise',function ()
{
    var cut

    assert.equal(render.truncate('short',20),'short')
    cut = render.truncate('abcdefghij',5)
    assert.equal(cut,'abcd…')
    return assert.equal(render.displayWidth(cut),5,'the result is exactly the requested width')
})
test('truncate: the ellipsis is a single glyph, not three dots',function ()
{
    assert.ok(render.truncate('abcdefghij',5).endsWith,'…')
    return assert.ok(!render.truncate('abcdefghij',5).endsWith('...'))
})
test('a long subject is truncated to the width',function ()
{
    var out

    out = plain(render.renderLog([commit()],{width:100}))
    assert.equal(widest(out),100)
    assert.ok(out.includes,'…','truncation is marked')
    return assert.ok(out.includes('AGENTS.md:'),'the start of the message survives')
})
test('output never exceeds the width when the budget allows',function ()
{
    var out, w

    var list = [70,80,90,100,111,120,160,190]
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        w = list[_a_]
        out = plain(render.renderLog([commit()],{width:w}))
        assert.ok(widest(out) <= w,`width ${w} must not overflow`)
    }
})
test('below the minimum message width, the message is left long rather than mangled',function ()
{
    var out

    assert.equal(render.NARROW_WIDTH,60)
    assert.equal(render.MIN_MESSAGE_WIDTH,40)
    out = plain(render.renderLog([commit()],{width:65}))
    assert.equal(widest(out),render.PREFIX_WIDTH + LONG_SUBJECT.length)
    assert.ok(!out.includes('…'),'no truncation below the floor')
    return assert.ok(out.includes(LONG_SUBJECT),'the whole message is present')
})
test('the narrow layout never overflows, even at absurd widths',function ()
{
    var out, w

    var list = [30,40,50,59]
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        w = list[_b_]
        out = plain(render.renderLog([commit()],{width:w}))
        assert.ok(widest(out) <= w,`width ${w} must not overflow`)
    }
})
test('below NARROW_WIDTH the message goes on its own line',function ()
{
    var lines, out

    out = plain(render.renderLog([commit({subject:'a message here'})],{width:50}))
    lines = out.split('\n')
    assert.equal(lines.length,2,'prefix on one line, message on the next')
    assert.match(lines[0],/^f9c98c7\x20Oct\x20{2}1\x2004:32\x20opencode$/)
    return assert.match(lines[1],/^\x20{2}a\x20message\x20here$/,'message is indented by 2')
})
test('the narrow layout still truncates a long message',function ()
{
    var out

    out = plain(render.renderLog([commit()],{width:50}))
    assert.ok(out.includes,'…')
    return assert.ok(widest(out) <= 50)
})
test('wrap: breaks on spaces and respects the width',function ()
{
    var l, lines

    lines = render.wrap('the quick brown fox jumps over the lazy dog',15)
    var list = _k_.list(lines)
    for (var _c_ = 0; _c_ < list.length; _c_++)
    {
        l = list[_c_]
        assert.ok(render.displayWidth(l) <= 15,`\"${l}\" fits`)
    }
    return assert.equal(lines.join(' '),'the quick brown fox jumps over the lazy dog')
})
test('wrap: preserves blank lines between paragraphs',function ()
{
    var lines

    lines = render.wrap('one\n\ntwo',20)
    return assert.deepEqual(lines,['one','','two'])
})
test('wrap: hard-splits a word longer than the width',function ()
{
    var l, lines

    lines = render.wrap(('x'.repeat(25)),10)
    assert.equal(lines.length,3,'25 characters at width 10 is 10 + 10 + 5')
    var list = _k_.list(lines)
    for (var _d_ = 0; _d_ < list.length; _d_++)
    {
        l = list[_d_]
        assert.ok(render.displayWidth(l) <= 10)
    }
    return assert.equal(lines.join('').length,25,'no characters are lost')
})
test('--long indents continuation lines under the subject column',function ()
{
    var l, lines, out

    out = plain(render.renderLog([commit()],{width:80,long:true}))
    lines = out.split('\n')
    assert.ok(lines.length > 1,'the message wraps')
    var list = _k_.list(lines.slice(1))
    for (var _e_ = 0; _e_ < list.length; _e_++)
    {
        l = list[_e_]
        assert.ok(l.startsWith(' '.repeat(render.PREFIX_WIDTH)),'continuations align')
    }
    return assert.ok(widest(out) <= 80)
})
test('--long keeps a blank paragraph break, without trailing spaces on it',function ()
{
    var body, line, out

    body = 'subject\n\nfirst para\n\nsecond para'
    out = plain(render.renderLog([commit({subject:body,body:body})],{width:80,long:true}))
    assert.ok(out.includes('\n\n'),'the paragraph break survives')
    var list = _k_.list(out.split('\n'))
    for (var _f_ = 0; _f_ < list.length; _f_++)
    {
        line = list[_f_]
        assert.equal(line,line.replace(/\s+$/,''),'no trailing whitespace')
    }
})
test('--long shows more than the subject alone',function ()
{
    var body, long, short

    body = 'the subject\n\nA body paragraph that git log --oneline would hide.'
    short = plain(render.renderLog([commit({subject:body,body:body})],{width:80}))
    long = plain(render.renderLog([commit({subject:body,body:body})],{width:80,long:true}))
    assert.ok(long.includes('A body paragraph'),'the body is shown')
    return assert.ok(!short.includes('A body paragraph'),'short mode shows the subject only')
})
test('displayWidth counts an em-dash as one column, not two bytes',function ()
{
    assert.equal(render.displayWidth('a—b'),3)
    assert.equal(render.displayWidth('…'),1)
    return assert.equal(render.displayWidth(''),0)
})
test('truncation accounts for multi-byte characters',function ()
{
    var t

    t = render.truncate('aa—bb—cc—dd',6)
    return assert.equal(render.displayWidth(t),6)
})
test('parseArgs: no arguments is short mode, whole history',function ()
{
    return assert.deepEqual(log.parseArgs([]),{ok:true,count:null,long:false})
})
test('parseArgs: a bare number is a commit count',function ()
{
    assert.deepEqual(log.parseArgs(['10']),{ok:true,count:10,long:false})
    return assert.deepEqual(log.parseArgs(['0']),{ok:true,count:0,long:false})
})
test('parseArgs: -l and --long both mean long mode',function ()
{
    assert.deepEqual(log.parseArgs(['-l']),{ok:true,count:null,long:true})
    return assert.deepEqual(log.parseArgs(['--long']),{ok:true,count:null,long:true})
})
test('parseArgs: the flag and a count combine in either order',function ()
{
    assert.deepEqual(log.parseArgs(['-l','5']),{ok:true,count:5,long:true})
    assert.deepEqual(log.parseArgs(['5','-l']),{ok:true,count:5,long:true})
    return assert.deepEqual(log.parseArgs(['5','--long']),{ok:true,count:5,long:true})
})
test('parseArgs: bad arguments are rejected, not silently ignored',function ()
{
    var bad, r

    var list = [['foo'],['-x'],['1.5'],['']]
    for (var _10_ = 0; _10_ < list.length; _10_++)
    {
        bad = list[_10_]
        r = log.parseArgs(bad)
        assert.equal(r.ok,false,`${JSON.stringify(bad)} rejected`)
        assert.match(r.message,/not\x20a\x20commit\x20count/)
    }
})
test('parseArgs: more than one count is an error',function ()
{
    var r

    r = log.parseArgs(['1','2'])
    assert.equal(r.ok,false)
    return assert.match(r.message,/at\x20most\x20one/)
})
test('terminalWidth uses the stream width when it is a real terminal',function ()
{
    assert.equal(log.terminalWidth({columns:120}),120)
    return assert.equal(log.terminalWidth({columns:40}),40)
})
test('terminalWidth falls back when the value is unusable',function ()
{
    var bad

    var list = [undefined,null,0,-1,NaN,'80']
    for (var _11_ = 0; _11_ < list.length; _11_++)
    {
        bad = list[_11_]
        assert.equal(log.terminalWidth({columns:bad}),render.DEFAULT_WIDTH,`${bad} falls back`)
    }
    return assert.equal(render.DEFAULT_WIDTH,80)
})
test('fitName still pads or crops to 8',function ()
{
    assert.equal(render.fitName('Thorsten'),'Thorsten')
    assert.equal(render.fitName('zoe'),'zoe     ')
    return assert.equal(render.fitName('Christopher'),'Christop')
})