var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var names, setNoColor, SGR, strip, withNoColor

import test from 'node:test'
import assert from 'node:assert/strict'
import theme from "../theme.js"

SGR = /\u001b\[[0-9;]*m/g

strip = function (s)
{
    return s.replace(SGR,'')
}

setNoColor = function (value)
{
    if (value === undefined)
    {
        return delete process.env.NO_COLOR
    }
    else
    {
        return process.env.NO_COLOR = value
    }
}

withNoColor = function (value, fn)
{
    var before, r

    before = process.env.NO_COLOR
    setNoColor(value)
    try
    {
        r = fn()
    }
    catch (err)
    {
        setNoColor(before)
        throw err
    }
    setNoColor(before)
    return r
}
names = ['add','del','mod','untracked','branch','repoPath','dim','bold','headStaged','headCommitted','headUnstaged','headUntracked','ahead','behind','logHash','logDate','logName']
test('createTheme: a plain palette emits no escape sequences',function ()
{
    var name, t

    t = theme.createTheme(false)
    assert.equal(t.enabled,false)
    var list = _k_.list(names)
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        name = list[_a_]
        assert.doesNotMatch(t[name]('x'),SGR,`${name} must not colour when disabled`)
    }
})
test('createTheme: an enabled palette colours, and passes text through',function ()
{
    var hasColour, t

    t = theme.createTheme(true)
    assert.equal(t.enabled,true)
    hasColour = function (s)
    {
        return (new RegExp(SGR)).test(s)
    }
    assert.ok(hasColour(t.add('x')),'add colours')
    assert.ok(hasColour(t.dim('x')),'dim colours')
    assert.ok(hasColour(t.branch('main')),'branch colours')
    return assert.equal(strip(t.dim('keep this')),'keep this','the text survives the escape codes')
})
test('createTheme: both palettes render the same text once stripped',function ()
{
    var name, off, on

    on = theme.createTheme(true)
    off = theme.createTheme(false)
    var list = ['add','del','branch','repoPath','dim','logHash']
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        name = list[_b_]
        assert.equal(strip(on[name]('x')),strip(off[name]('x')),name)
    }
})
test('theme: the default palette follows NO_COLOR as loaded',function ()
{
    var colour, plain

    colour = withNoColor('1',function ()
    {
        return theme.createTheme(false)
    })
    assert.equal(colour.enabled,false)
    plain = withNoColor(undefined,function ()
    {
        return theme.createTheme(true)
    })
    assert.equal(plain.enabled,true)
    return assert.equal(typeof(theme.theme.enabled),'boolean','the default export carries its own flag')
})