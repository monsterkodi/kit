var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}}

var filterPaths, log, parseArgs, terminalWidth

import git from "./git.js"

import render from "./render.js"

import diff from "./diff.js"

import theme from "./theme.js"


parseArgs = function (args)
{
    var arg, files, filtering, long, numbers, paths

    long = false
    files = false
    numbers = []
    paths = []
    filtering = false
    var list = _k_.list(args)
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        arg = list[_a_]
        if (_k_.in(arg,['-l','--long']))
        {
            long = true
            continue
        }
        if (_k_.in(arg,['-f','--files']))
        {
            files = true
            filtering = true
            continue
        }
        if ((/^\d+$/).test(arg))
        {
            numbers.push(arg)
            continue
        }
        if (filtering)
        {
            paths.push(arg)
            continue
        }
        return {ok:false,message:`'${arg}' is not a commit count (try: kit log 10)`}
    }
    if (numbers.length > 1)
    {
        return {ok:false,message:`expected at most one commit count, got ${numbers.length}`}
    }
    return {ok:true,count:numbers.length ? Number(numbers[0]) : null,long:long,files:files,paths:paths}
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

filterPaths = function (args)
{
    var label, parsed, _89_39_

    parsed = diff.parseArgs(args,git.isCommit)
    if (!parsed.ok)
    {
        return {ok:false,message:parsed.message}
    }
    if (parsed.target)
    {
        label = (parsed.target.number != null) ? `-${parsed.target.number}` : parsed.target.rev
        return {ok:false,message:`'${label}' is a commit, not a path`}
    }
    return {ok:true,paths:parsed.paths}
}

log = function (args, io = console, env = {})
{
    var detail, out, p, parsed, paths, res, t, width, _118_18_, _131_22_, _131_49_

    if (!git.inRepo())
    {
        io.error('kit log: not a git repository')
        return 128
    }
    parsed = parseArgs(args)
    if (!parsed.ok)
    {
        io.error('kit log: ' + parsed.message)
        return 1
    }
    paths = []
    if (parsed.paths.length > 0)
    {
        p = filterPaths(parsed.paths)
        if (!p.ok)
        {
            io.error('kit log: ' + p.message)
            return 1
        }
        paths = p.paths
    }
    t = ((_118_18_=env.theme) != null ? _118_18_ : theme.theme)
    res = git.collectLog(parsed.count,{long:parsed.long,files:parsed.files,paths:paths})
    if (res.error)
    {
        detail = res.error.stderr.trim()
        io.error('kit log: ' + (_k_.empty(detail) ? 'git log failed' : detail))
        return res.error.code
    }
    width = ((_131_22_=env.width) != null ? _131_22_ : terminalWidth(((_131_49_=env.stream) != null ? _131_49_ : process.stdout)))
    out = render.renderLog(res.data,{width:width,long:parsed.long,theme:t})
    if (out)
    {
        io.log(out)
    }
    return 0
}
export default {
    parseArgs:parseArgs,
    terminalWidth:terminalWidth,
    filterPaths:filterPaths,
    log:log
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2xvZy5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09Bb0JNLFVBQUE7O09BQ0EsYUFBQTs7T0FDQSxXQUFBOztPQUNBLFlBQUE7OztBQUVOLHNCQUFhOzs7O0lBRVQsT0FBTztJQUNQLFFBQVE7SUFDUjtJQUNBO0lBQ0EsWUFBWTt3QkFFRDs7O1FBQVA7bUJBRUcsS0FBUSxLQUFLOztZQUNaLE9BQU87WUFDUDs7bUJBRUQsS0FBUSxLQUFLOztZQUNaLFFBQVE7WUFDUixZQUFZO1lBQ1o7O2FBSUEsU0FBUyxLQUFLOztZQUNkLFFBQVEsS0FBSztZQUNiOztZQUtEOztZQUNDLE1BQU0sS0FBSztZQUNYOztnQkFFRixHQUFJLE1BQU8sWUFBYTs7UUFFM0IsUUFBUSxTQUFTOztnQkFDZCxHQUFJLE1BQU8sa0RBQW1ELFFBQVE7O1lBRTVFLEdBQUksS0FDSixNQUFVLFFBQVEsU0FBWSxPQUFPLFFBQVEsTUFBUyxLQUN0RCxLQUFNLEtBQ04sTUFBTyxNQUNQLE1BQU87OztBQUlYLDBCQUFpQixNQUFJLFFBQVE7Ozs7SUFFekIsUUFBTyxjQUFBLElBQUs7UUFDVCxPQUFPLFVBQVUsU0FBVSxPQUFPOztlQUFTOztXQUM5QyxPQUFPOzs7QUFJWCx3QkFBZTs7OztJQUVYLFNBQVMsS0FBSyxVQUFVLEtBQU0sSUFBSTtTQUUzQixPQUFPOztnQkFBVyxHQUFJLE1BQU8sUUFBUyxPQUFPOztRQUtqRCxPQUFPOztRQUNOLFNBQVcsT0FBTyxPQUFPLHNCQUFpQixPQUFPLE9BQU8sV0FBYyxPQUFPLE9BQU87Z0JBQ2pGLEdBQUksTUFBTyxZQUFhOztZQUU5QixHQUFJLEtBQU0sTUFBTyxPQUFPOzs7QUFFN0IsZ0JBQU8sTUFBTSxLQUFHLFNBQVM7Ozs7U0FFZCxJQUFJOztRQUNQLEdBQUcsTUFBTTtlQUNGOztJQUVYLFNBQVMsVUFBVTtTQUVaLE9BQU87O1FBQ1YsR0FBRyxNQUFNLGNBQWMsT0FBTztlQUN2Qjs7SUFFWDtRQUVHLE9BQU8sTUFBTSxTQUFTOztRQUVyQixJQUFJLFlBQVksT0FBTzthQUVoQixFQUFFOztZQUNMLEdBQUcsTUFBTSxjQUFjLEVBQUU7bUJBQ2xCOztRQUVYLFFBQVEsRUFBRTs7SUFFZCxlQUFJLElBQUksNEJBQVEsTUFBTTtJQUV0QixNQUFNLElBQUksV0FBVyxPQUFPLE9BQ3hCLEtBQU0sT0FBTyxLQUNiLE1BQU8sT0FBTyxNQUNkLE1BQU87UUFHUixJQUFJOztRQUNILFNBQVMsSUFBSSxNQUFNLE9BQU87UUFDMUIsR0FBRyxNQUFNLHlCQUF3QixVQUFZLG1CQUFzQjtlQUM1RCxJQUFJLE1BQU07O0lBRXJCLG1CQUFRLElBQUksNEJBQVEseUJBQWMsSUFBSSw2QkFBUyxRQUFRO0lBQ3ZELE1BQU0sT0FBTyxVQUFVLElBQUksTUFBTyxNQUFBLE1BQU8sS0FBTSxPQUFPLEtBQU0sTUFBTztRQUVoRTs7UUFBUyxHQUFHLElBQUk7O1dBQ25COzs7SUFHQSxVQUFXO0lBQ1gsY0FBZTtJQUNmLFlBQWE7SUFDYixJQUFLIn0=
//# sourceURL=../kode/log.kode
