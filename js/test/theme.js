var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var all, cases, codes, colour, commit, enabled, forcedColour, forcedPlain, hasColour, key, m, name, names, off, on, out, plain, set, setNoColor, SGR, strip, t, tree, unset, withNoColor

import git from "../git.js"

import render from "../render.js"

import theme from "../theme.js"

import style from "./style.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches

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
names = ['add','del','mod','untracked','branch','repoPath','dim','bold','headStaged','headCommitted','headUnstaged','headUntracked','ahead','behind','logHash','logDate','logName','logBody']

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
toExport["createTheme"] = async function ()
{
    await section("a plain palette emits no escape sequences", async function ()
    {
        t = theme.createTheme(false)
        compare(t.enabled,false)
        var list = _k_.list(names)
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            name = list[_a_]
            notMatches(t[name]('x'),SGR)
        }
    })
    await section("an enabled palette colours, and passes text through", async function ()
    {
        t = theme.createTheme(true)
        compare(t.enabled,true)
        hasColour = function (s)
        {
            return (new RegExp(SGR)).test(s)
        }
        compare(hasColour(t.add('x')),true)
        compare(hasColour(t.dim('x')),true)
        compare(hasColour(t.branch('main')),true)
        compare(strip(t.dim('keep this')),'keep this')
    })
    await section("both palettes render the same text once stripped", async function ()
    {
        on = theme.createTheme(true)
        off = theme.createTheme(false)
        var list1 = ['add','del','branch','repoPath','dim','logHash']
        for (var _b_ = 0; _b_ < list1.length; _b_++)
        {
            name = list1[_b_]
            compare(strip(on[name]('x')),strip(off[name]('x')))
        }
    })
    await section("the body grey walks from light to dark", async function ()
    {
        t = theme.createTheme(true)
        codes = [0,1,2].map(function (i)
        {
            var m

            m = t.logBody('x',i,3).match(/\u001b\[38;5;(\d+)m/)
            return Number(m[1])
        })
        compare(codes[0] > codes[1],true)
        compare(codes[1] > codes[2],true)
    })
    await section("a body of one line is the light end of the ramp", async function ()
    {
        t = theme.createTheme(true)
        m = t.logBody('x',0,1).match(/\u001b\[38;5;(\d+)m/)
        compare(Number(m[1]),250)
    })
    await section("a body without a line count is the light end of the ramp", async function ()
    {
        t = theme.createTheme(true)
        m = t.logBody('x').match(/\u001b\[38;5;(\d+)m/)
        compare(Number(m[1]),250)
    })
}
toExport["createTheme"]._section_ = true
toExport["theme"] = async function ()
{
    await section("the default palette follows NO_COLOR as loaded", async function ()
    {
        colour = withNoColor('1',function ()
        {
            return theme.createTheme(false)
        })
        compare(colour.enabled,false)
        plain = withNoColor(undefined,function ()
        {
            return theme.createTheme(true)
        })
        compare(plain.enabled,true)
        compare(typeof(theme.theme.enabled),'boolean')
    })
}
toExport["theme"]._section_ = true
toExport["renderers"] = async function ()
{
    await section("output does not depend on NO_COLOR once a palette is passed", async function ()
    {
        unset = withNoColor(undefined,function ()
        {
            return all()
        })
        set = withNoColor('1',function ()
        {
            return all()
        })
        var list2 = _k_.list(Object.keys(cases))
        for (var _c_ = 0; _c_ < list2.length; _c_++)
        {
            key = list2[_c_]
            compare(set[key],unset[key])
            notMatches(unset[key],SGR)
        }
    })
    await section("the palette argument wins over the environment", async function ()
    {
        enabled = theme.createTheme(true)
        forcedPlain = withNoColor('1',function ()
        {
            return render.renderLog([commit],{theme:theme.createTheme(false)})
        })
        notMatches(forcedPlain,SGR)
        forcedColour = withNoColor(undefined,function ()
        {
            return render.renderLog([commit],{theme:enabled})
        })
        matches(forcedColour,SGR)
    })
    await section("an omitted palette falls back to the default, not a crash", async function ()
    {
        out = render.renderLog([commit],{width:200})
        compare(out.includes('third'),true)
    })
}
toExport["renderers"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC90aGVtZS5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQWNBLE1BQU07O0FBRU47O1dBQWUsRUFBRSxRQUFRLElBQUs7OztBQUU5Qjs7UUFFTyxVQUFTOztzQkFBc0IsUUFBUSxJQUFJOzs7O2VBQ3pDLFFBQVEsSUFBSSxXQUFXOzs7O0FBRWhDOzs7O0lBRUksU0FBUyxRQUFRLElBQUk7SUFDckIsV0FBVzs7O1FBR1AsSUFBSTs7V0FDRjs7UUFDRixXQUFXO1FBQ1gsTUFBTTs7SUFFVixXQUFXO1dBQ1g7O0FBRUosU0FDSSxNQUFNLE1BQU0sTUFBTSxZQUFZLFNBQVMsV0FBVyxNQUFNLE9BQ3hELGFBQWEsZ0JBQWdCLGVBQWUsZ0JBQWdCLFFBQVEsU0FDcEUsVUFBVSxVQUFVLFVBQVU7O0FBR2xDOzs7O0lBQ0ksT0FDSSw0QkFDQSxxQkFDQSxpREFDQSxZQUNFLEtBQUssUUFBUTtXQUNuQixJQUFJLGNBQWM7O0FBRXRCLFVBQVMsS0FBTSxVQUFXLEtBQU0sZUFBZ0IsS0FBTSxXQUFZLFFBQVM7QUFFM0UsU0FDSTs7V0FBVyxPQUFPLGFBQWEsUUFBUyxNQUFPLE1BQU07RUFDckQ7O1dBQVEsT0FBTyxXQUFXLFNBQVUsTUFBTyxNQUFNO0VBQ2pEOztXQUFVLE9BQU8sYUFBYSxLQUFNLFFBQVMsS0FBTSxNQUFPLE1BQU8sTUFBTTtFQUN2RTs7V0FBVyxPQUFPLG9CQUFvQiwyQkFBNEIsTUFBTyxNQUFNOzs7QUFFbkY7O1dBQVMsT0FBTyxZQUFZLE9BQU8sUUFBUSxPQUFPOztnQkFBa0IsRUFBRzs7Ozs7OztRQU0vRCxJQUFJLE1BQU0sWUFBWTtnQkFDdEIsRUFBRSxRQUFVOzRCQUVBOzs7O1lBQ1IsV0FBVyxFQUFFLE1BQU0sS0FBTTs7Ozs7UUFJN0IsSUFBSSxNQUFNLFlBQVk7Z0JBQ3RCLEVBQUUsUUFBVTtRQUVaOzt3QkFBd0IsT0FBTyxNQUFNLEtBQUs7O2dCQUUxQyxVQUFVLEVBQUUsSUFBSSxNQUFRO2dCQUN4QixVQUFVLEVBQUUsSUFBSSxNQUFRO2dCQUN4QixVQUFVLEVBQUUsT0FBTyxTQUFXO2dCQUM5QixNQUFNLEVBQUUsSUFBSSxjQUFnQjs7OztRQUk1QixLQUFNLE1BQU0sWUFBWTtRQUN4QixNQUFNLE1BQU0sWUFBWTtxQkFFWCxNQUFNLE1BQU0sU0FBUyxXQUFXLE1BQU07Ozs7b0JBQy9DLE1BQU0sR0FBRyxNQUFNLE1BQVEsTUFBTSxJQUFJLE1BQU07Ozs7O1FBSTNDLElBQUksTUFBTSxZQUFZO1FBRXRCLFNBQVMsRUFBRSxFQUFFLEdBQUc7Ozs7WUFDWixJQUFJLEVBQUUsUUFBUSxJQUFLLEVBQUcsR0FBRyxNQUFNO21CQUMvQixPQUFPLEVBQUU7O2dCQUViLE1BQU0sS0FBSyxNQUFNLEdBQUs7Z0JBQ3RCLE1BQU0sS0FBSyxNQUFNLEdBQUs7Ozs7UUFJdEIsSUFBSSxNQUFNLFlBQVk7UUFFdEIsSUFBSSxFQUFFLFFBQVEsSUFBSyxFQUFHLEdBQUcsTUFBTTtnQkFFL0IsT0FBTyxFQUFFLElBQU07Ozs7UUFJZixJQUFJLE1BQU0sWUFBWTtRQUV0QixJQUFJLEVBQUUsUUFBUSxLQUFLLE1BQU07Z0JBRXpCLE9BQU8sRUFBRSxJQUFNOzs7Ozs7OztRQU1mLFNBQVMsWUFBWTs7bUJBQVEsTUFBTSxZQUFZOztnQkFDL0MsT0FBTyxRQUFVO1FBRWpCLFFBQVEsWUFBWTs7bUJBQWMsTUFBTSxZQUFZOztnQkFDcEQsTUFBTSxRQUFVO2dCQUVoQixPQUFPLE1BQU0sTUFBTSxTQUFXOzs7Ozs7OztRQU05QixRQUFRLFlBQVk7O21CQUFjOztRQUNsQyxNQUFNLFlBQVk7O21CQUFROzs2QkFFZixPQUFPLEtBQUs7Ozs7b0JBQ25CLElBQUksS0FBTyxNQUFNO1lBQ2pCLFdBQVcsTUFBTSxLQUFNOzs7OztRQUkzQixVQUFVLE1BQU0sWUFBWTtRQUU1QixjQUFjLFlBQVk7O21CQUFRLE9BQU8sV0FBVyxTQUFVLE1BQU8sTUFBTSxZQUFZOztRQUN2RixXQUFXLFlBQWE7UUFFeEIsZUFBZSxZQUFZOzttQkFBYyxPQUFPLFdBQVcsU0FBVSxNQUFPOztRQUM1RSxRQUFRLGFBQWM7Ozs7UUFJdEIsTUFBTSxPQUFPLFdBQVcsU0FBVSxNQUFPO2dCQUV6QyxJQUFJLFNBQVMsU0FBVyJ9
//# sourceURL=file:///home/kodi/s/kit/kode/test/theme.kode
