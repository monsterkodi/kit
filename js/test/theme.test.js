var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var all, cases, commit, names, setNoColor, SGR, strip, tree, withNoColor

import test from 'node:test'
import assert from 'node:assert/strict'
import git from "../git.js"

import render from "../render.js"

import theme from "../theme.js"

import style from "./style.js"

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

tree = function ()
{
    var raw

    raw = ['# branch.oid abc123def456','# branch.head main','1 A. N... 100644 100644 100644 a b src/new.mjs','? build/'].join('\0') + '\0'
    return git.parseStatusV2(raw)
}
commit = {hash:'c63ebbf',date:'Oct  2 00:18',name:'Thorsten',subject:'third'}
cases = {status:function ()
{
    return render.renderStatus(tree(),{theme:style.plainTheme})
},log:function ()
{
    return render.renderLog([commit],{theme:style.plainTheme})
},entry:function ()
{
    return render.renderEntry({path:'a.mjs',code:'M'},{theme:style.plainTheme})
},commit:function ()
{
    return render.renderCommitSuccess('[master e3cd348] fourth',{theme:style.plainTheme})
}}

all = function ()
{
    return Object.fromEntries(Object.entries(cases).map(function ([k,fn])
    {
        return [k,fn()]
    }))
}
test('renderers: output does not depend on NO_COLOR once a palette is passed',function ()
{
    var key, set, unset

    unset = withNoColor(undefined,function ()
    {
        return all()
    })
    set = withNoColor('1',function ()
    {
        return all()
    })
    var list = _k_.list(Object.keys(cases))
    for (var _c_ = 0; _c_ < list.length; _c_++)
    {
        key = list[_c_]
        assert.equal(set[key],unset[key],`${key} must not read NO_COLOR`)
        assert.doesNotMatch(unset[key],SGR,`${key} must be plain when handed a plain palette`)
    }
})
test('renderers: the palette argument wins over the environment',function ()
{
    var enabled, forcedColour, forcedPlain

    enabled = theme.createTheme(true)
    forcedPlain = withNoColor('1',function ()
    {
        return render.renderLog([commit],{theme:theme.createTheme(false)})
    })
    assert.doesNotMatch(forcedPlain,SGR,'an explicit plain palette beats NO_COLOR')
    forcedColour = withNoColor(undefined,function ()
    {
        return render.renderLog([commit],{theme:enabled})
    })
    return assert.match(forcedColour,SGR,'an explicit enabled palette survives an unset NO_COLOR')
})
test('renderers: an omitted palette falls back to the default, not a crash',function ()
{
    var out

    out = render.renderLog([commit],{width:200})
    return assert.ok(out.includes('third'),'the subject renders with no palette argument at all')
})

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUudGVzdC5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L3RoZW1lLnRlc3Qua29kZSJdLCJtYXBwaW5ncyI6Ijs7OztPQXNCTyxLQUFLLEtBQUs7T0FDVixPQUFPLEtBQUs7Ozs7Ozs7OztBQVduQixNQUFNOztBQUVOOztXQUFlLEVBQUUsUUFBUSxJQUFLOzs7QUFLOUI7O1FBRU8sVUFBUzs7c0JBQXNCLFFBQVEsSUFBSTs7OztlQUN6QyxRQUFRLElBQUksV0FBVzs7OztBQU1oQzs7OztJQUVJLFNBQVMsUUFBUSxJQUFJO0lBQ3JCLFdBQVc7OztRQUdQLElBQUk7O1dBQ0Y7O1FBQ0YsV0FBVztRQUNYLE1BQU07O0lBRVYsV0FBVztXQUNYOztBQUVKLFNBQ0ksTUFBTSxNQUFNLE1BQU0sWUFBWSxTQUFTLFdBQVcsTUFBTSxPQUN4RCxhQUFhLGdCQUFnQixlQUFlLGdCQUFnQixRQUFRLFNBQ3BFLFVBQVUsVUFBVTtBQUd4QixLQUFLOzs7O0lBRUQsSUFBSSxNQUFNLFlBQVk7SUFDdEIsT0FBTyxNQUFNLEVBQUUsUUFBUzt3QkFFWjs7OztRQUNSLE9BQU8sYUFBYSxFQUFFLE1BQU0sS0FBTSxPQUFROzs7QUFFbEQsS0FBSzs7OztJQUVELElBQUksTUFBTSxZQUFZO0lBQ3RCLE9BQU8sTUFBTSxFQUFFLFFBQVM7SUFLeEI7O29CQUF3QixPQUFPLE1BQU0sS0FBSzs7SUFFMUMsT0FBTyxHQUFHLFVBQVUsRUFBRSxJQUFJLE1BQU87SUFDakMsT0FBTyxHQUFHLFVBQVUsRUFBRSxJQUFJLE1BQU87SUFDakMsT0FBTyxHQUFHLFVBQVUsRUFBRSxPQUFPLFNBQVU7V0FDdkMsT0FBTyxNQUFNLE1BQU0sRUFBRSxJQUFJLGNBQWUsWUFBYTs7QUFFekQsS0FBSzs7OztJQUVELEtBQU0sTUFBTSxZQUFZO0lBQ3hCLE1BQU0sTUFBTSxZQUFZO2dCQUVYLE1BQU0sTUFBTSxTQUFTLFdBQVcsTUFBTTs7OztRQUMvQyxPQUFPLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTyxNQUFNLElBQUksTUFBTSxNQUFPOzs7QUFPbEUsS0FBSzs7OztJQUVELFNBQVMsWUFBWTs7ZUFBUSxNQUFNLFlBQVk7O0lBQy9DLE9BQU8sTUFBTSxPQUFPLFFBQVM7SUFFN0IsUUFBUSxZQUFZOztlQUFjLE1BQU0sWUFBWTs7SUFDcEQsT0FBTyxNQUFNLE1BQU0sUUFBUztXQUU1QixPQUFPLE1BQU0sT0FBTyxNQUFNLE1BQU0sU0FBVSxVQUFXOzs7QUFlekQ7Ozs7SUFDSSxPQUNJLDRCQUNBLHFCQUNBLGlEQUNBLFlBQ0UsS0FBSyxRQUFRO1dBQ25CLElBQUksY0FBYzs7QUFFdEIsVUFBUyxLQUFNLFVBQVcsS0FBTSxlQUFnQixLQUFNLFdBQVksUUFBUztBQUUzRSxTQUNJOztXQUFXLE9BQU8sYUFBYSxRQUFTLE1BQU8sTUFBTTtFQUNyRDs7V0FBUSxPQUFPLFdBQVcsU0FBVSxNQUFPLE1BQU07RUFDakQ7O1dBQVUsT0FBTyxhQUFhLEtBQU0sUUFBUyxLQUFNLE1BQU8sTUFBTyxNQUFNO0VBQ3ZFOztXQUFXLE9BQU8sb0JBQW9CLDJCQUE0QixNQUFPLE1BQU07OztBQUVuRjs7V0FBUyxPQUFPLFlBQVksT0FBTyxRQUFRLE9BQU87O2dCQUFrQixFQUFHOzs7QUFFdkUsS0FBSzs7OztJQUVELFFBQVEsWUFBWTs7ZUFBYzs7SUFDbEMsTUFBTSxZQUFZOztlQUFROzt3QkFFZixPQUFPLEtBQUs7Ozs7UUFDbkIsT0FBTyxNQUFNLElBQUksS0FBTSxNQUFNLFFBQVM7UUFDdEMsT0FBTyxhQUFhLE1BQU0sS0FBTSxPQUFROzs7QUFPaEQsS0FBSzs7OztJQUVELFVBQVUsTUFBTSxZQUFZO0lBRTVCLGNBQWMsWUFBWTs7ZUFBUSxPQUFPLFdBQVcsU0FBVSxNQUFPLE1BQU0sWUFBWTs7SUFDdkYsT0FBTyxhQUFhLFlBQWEsSUFBSztJQUV0QyxlQUFlLFlBQVk7O2VBQWMsT0FBTyxXQUFXLFNBQVUsTUFBTzs7V0FDNUUsT0FBTyxNQUFNLGFBQWMsSUFBSzs7QUFFcEMsS0FBSzs7OztJQUVELE1BQU0sT0FBTyxXQUFXLFNBQVUsTUFBTztXQUV6QyxPQUFPLEdBQUcsSUFBSSxTQUFTLFNBQVUifQ==
//# sourceURL=file://kode/test/theme.test.kode
