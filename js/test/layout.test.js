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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC9sYXlvdXQudGVzdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09BWU8sS0FBSyxLQUFLO09BQ1YsT0FBTyxLQUFLOzs7Ozs7QUFLbkI7O1dBQWUsRUFBRSxRQUFRLG9CQUFxQjs7O0FBQzlDOztXQUFnQixNQUFNLEdBQUcsTUFBTSxNQUFNOztlQUFXLE9BQU8sYUFBYTs7O0FBRXBFLGVBQWU7O0FBRWY7Ozs7SUFFSSxRQUNJLEtBQU0sVUFDTixLQUFNLGVBQ04sS0FBTSxXQUNOLFFBQVMsYUFDVCxLQUFNO1dBRVYsT0FBTyxPQUFPLEtBQU07OztBQUV4Qjs7V0FBZ0IsS0FBSyxJQUFJLE1BQU0sS0FBTSxPQUFPOztBQUU1QyxLQUFLOzs7O0lBRUQsT0FBTyxNQUFNLE9BQU8sYUFBYztJQUVsQyxPQUFPLE1BQU0sT0FBTyxXQUFXLFFBQVEsUUFBUyxRQUFTLE1BQU87V0FFaEUsT0FBTyxNQUFNLE9BQU8sYUFBYSxNQUFPLE9BQU8sZUFBZTs7QUFFbEUsS0FBSzs7OztJQUVELE1BQU0sTUFBTSxPQUFPLFdBQVcsUUFBUSxRQUFTLGdCQUFpQixNQUFPO0lBRXZFLE9BQU8sTUFBTSxJQUFLO1dBQ2xCLE9BQU8sSUFBTyxJQUFJLFNBQVM7O0FBRS9CLEtBQUs7Ozs7SUFFRCxPQUFPLE1BQU0sT0FBTyxTQUFTLFFBQVMsSUFBSztJQUUzQyxNQUFNLE9BQU8sU0FBUyxhQUFjO0lBRXBDLE9BQU8sTUFBTSxJQUFLO1dBQ2xCLE9BQU8sTUFBTSxPQUFPLGFBQWEsS0FBTSxFQUFHOztBQUU5QyxLQUFLOztJQUVELE9BQU8sR0FBRyxPQUFPLFNBQVMsYUFBYyxHQUFHLFNBQVM7V0FDcEQsT0FBTyxJQUFPLE9BQU8sU0FBUyxhQUFjLEdBQUcsU0FBUzs7QUFFNUQsS0FBSzs7OztJQUVELE1BQU0sTUFBTSxPQUFPLFdBQVcsV0FBWSxNQUFPO0lBRWpELE9BQU8sTUFBTSxPQUFPLEtBQU07SUFDMUIsT0FB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
//# sourceURL=file:///home/kodi/s/kit/kode/test/layout.test.kode
