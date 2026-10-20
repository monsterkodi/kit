var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var all, cases, colour, commit, enabled, forcedColour, forcedPlain, hasColour, key, name, names, off, on, out, plain, set, setNoColor, SGR, strip, t, tree, unset, withNoColor

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
names = ['add','del','mod','untracked','branch','repoPath','dim','bold','headStaged','headCommitted','headUnstaged','headUntracked','ahead','behind','logHash','logDate','logName']

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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC90aGVtZS5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQWNBLE1BQU07O0FBRU47O1dBQWUsRUFBRSxRQUFRLElBQUs7OztBQUU5Qjs7UUFFTyxVQUFTOztzQkFBc0IsUUFBUSxJQUFJOzs7O2VBQ3pDLFFBQVEsSUFBSSxXQUFXOzs7O0FBRWhDOzs7O0lBRUksU0FBUyxRQUFRLElBQUk7SUFDckIsV0FBVzs7O1FBR1AsSUFBSTs7V0FDRjs7UUFDRixXQUFXO1FBQ1gsTUFBTTs7SUFFVixXQUFXO1dBQ1g7O0FBRUosU0FDSSxNQUFNLE1BQU0sTUFBTSxZQUFZLFNBQVMsV0FBVyxNQUFNLE9BQ3hELGFBQWEsZ0JBQWdCLGVBQWUsZ0JBQWdCLFFBQVEsU0FDcEUsVUFBVSxVQUFVOztBQUd4Qjs7OztJQUNJLE9BQ0ksNEJBQ0EscUJBQ0EsaURBQ0EsWUFDRSxLQUFLLFFBQVE7V0FDbkIsSUFBSSxjQUFjOztBQUV0QixVQUFTLEtBQU0sVUFBVyxLQUFNLGVBQWdCLEtBQU0sV0FBWSxRQUFTO0FBRTNFLFNBQ0k7O1dBQVcsT0FBTyxhQUFhLFFBQVMsTUFBTyxNQUFNO0VBQ3JEOztXQUFRLE9BQU8sV0FBVyxTQUFVLE1BQU8sTUFBTTtFQUNqRDs7V0FBVSxPQUFPLGFBQWEsS0FBTSxRQUFTLEtBQU0sTUFBTyxNQUFPLE1BQU07RUFDdkU7O1dBQVcsT0FBTyxvQkFBb0IsMkJBQTRCLE1BQU8sTUFBTTs7O0FBRW5GOztXQUFTLE9BQU8sWUFBWSxPQUFPLFFBQVEsT0FBTzs7Z0JBQWtCLEVBQUc7Ozs7Ozs7UUFNL0QsSUFBSSxNQUFNLFlBQVk7Z0JBQ3RCLEVBQUUsUUFBVTs0QkFFQTs7OztZQUNSLFdBQVcsRUFBRSxNQUFNLEtBQU07Ozs7O1FBSTdCLElBQUksTUFBTSxZQUFZO2dCQUN0QixFQUFFLFFBQVU7UUFFWjs7d0JBQXdCLE9BQU8sTUFBTSxLQUFLOztnQkFFMUMsVUFBVSxFQUFFLElBQUksTUFBUTtnQkFDeEIsVUFBVSxFQUFFLElBQUksTUFBUTtnQkFDeEIsVUFBVSxFQUFFLE9BQU8sU0FBVztnQkFDOUIsTUFBTSxFQUFFLElBQUksY0FBZ0I7Ozs7UUFJNUIsS0FBTSxNQUFNLFlBQVk7UUFDeEIsTUFBTSxNQUFNLFlBQVk7cUJBRVgsTUFBTSxNQUFNLFNBQVMsV0FBVyxNQUFNOzs7O29CQUMvQyxNQUFNLEdBQUcsTUFBTSxNQUFRLE1BQU0sSUFBSSxNQUFNOzs7Ozs7Ozs7UUFNM0MsU0FBUyxZQUFZOzttQkFBUSxNQUFNLFlBQVk7O2dCQUMvQyxPQUFPLFFBQVU7UUFFakIsUUFBUSxZQUFZOzttQkFBYyxNQUFNLFlBQVk7O2dCQUNwRCxNQUFNLFFBQVU7Z0JBRWhCLE9BQU8sTUFBTSxNQUFNLFNBQVc7Ozs7Ozs7O1FBTTlCLFFBQVEsWUFBWTs7bUJBQWM7O1FBQ2xDLE1BQU0sWUFBWTs7bUJBQVE7OzZCQUVmLE9BQU8sS0FBSzs7OztvQkFDbkIsSUFBSSxLQUFPLE1BQU07WUFDakIsV0FBVyxNQUFNLEtBQU07Ozs7O1FBSTNCLFVBQVUsTUFBTSxZQUFZO1FBRTVCLGNBQWMsWUFBWTs7bUJBQVEsT0FBTyxXQUFXLFNBQVUsTUFBTyxNQUFNLFlBQVk7O1FBQ3ZGLFdBQVcsWUFBYTtRQUV4QixlQUFlLFlBQVk7O21CQUFjLE9BQU8sV0FBVyxTQUFVLE1BQU87O1FBQzVFLFFBQVEsYUFBYzs7OztRQUl0QixNQUFNLE9BQU8sV0FBVyxTQUFVLE1BQU87Z0JBRXpDLElBQUksU0FBUyxTQUFXIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/test/theme.kode
