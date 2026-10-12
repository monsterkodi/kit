var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}}

var log, parseArgs, terminalWidth

import git from "./git.js"

import render from "./render.js"


parseArgs = function (args)
{
    var arg, long, numbers

    long = false
    numbers = []
    var list = _k_.list(args)
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        arg = list[_a_]
        if (_k_.in(arg,['-l','--long']))
        {
            long = true
        }
        else if ((/^\d+$/).test(arg))
        {
            numbers.push(arg)
        }
        else
        {
            return {ok:false,message:`kit log: '${arg}' is not a commit count (try: kit log 10)`}
        }
    }
    if (numbers.length > 1)
    {
        return {ok:false,message:`kit log: expected at most one commit count, got ${numbers.length}`}
    }
    return {ok:true,count:numbers.length ? Number(numbers[0]) : null,long:long}
}

terminalWidth = function (out = process.stdout)
{
    var cols

    cols = (out != null ? out.columns : undefined)
    if (Number.isInteger(cols) && cols > 0)
    {
        return cols
    }
    return render.DEFAULT_WIDTH
}

log = function (args, io = console, env = {})
{
    var detail, out, parsed, res, width, _78_22_, _78_49_

    if (!git.inRepo())
    {
        io.error('kit log: not a git repository')
        return 128
    }
    parsed = parseArgs(args)
    if (!parsed.ok)
    {
        io.error(parsed.message)
        return 1
    }
    res = git.collectLog(parsed.count,{long:parsed.long})
    if (res.error)
    {
        detail = res.error.stderr.trim()
        io.error('kit log: ' + (_k_.empty(detail) ? 'git log failed' : detail))
        return res.error.code
    }
    width = ((_78_22_=env.width) != null ? _78_22_ : terminalWidth(((_78_49_=env.stream) != null ? _78_49_ : process.stdout)))
    out = render.renderLog(res.data,{width:width,long:parsed.long,theme:env.theme})
    if (out)
    {
        io.log(out)
    }
    return 0
}
export default {
    parseArgs:parseArgs,
    terminalWidth:terminalWidth,
    log:log
}