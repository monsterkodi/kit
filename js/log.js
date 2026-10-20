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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2xvZy5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBeUJBOzs7O0lBRUksT0FBTztJQUNQLFFBQVE7SUFDUjtJQUNBO0lBQ0EsWUFBWTt3QkFFRDs7OzttQkFFSixLQUFRLEtBQUs7O1lBQ1osT0FBTztZQUNQOzttQkFFRCxLQUFRLEtBQUs7O1lBQ1osUUFBUTtZQUNSLFlBQVk7WUFDWjs7YUFJQSxTQUFTLEtBQUs7O1lBQ2QsUUFBUSxLQUFLO1lBQ2I7O1lBS0Q7O1lBQ0MsTUFBTSxLQUFLO1lBQ1g7O2dCQUVGLEdBQUksTUFBTyxZQUFhOztRQUUzQixRQUFRLFNBQVM7O2dCQUNkLEdBQUksTUFBTyxrREFBbUQsUUFBUTs7WUFFNUUsR0FBSSxLQUNKLE1BQVUsUUFBUSxTQUFZLE9BQU8sUUFBUSxNQUFTLEtBQ3RELEtBQU0sS0FDTixNQUFPLE1BQ1AsTUFBTzs7O0FBSVg7Ozs7SUFFSSxRQUFPLGNBQUEsSUFBSztRQUNULE9BQU8sVUFBVSxTQUFVLE9BQU87O2VBQVM7O1dBQzlDLE9BQU87OztBQUlYOzs7O0lBRUksU0FBUyxLQUFLLFVBQVUsS0FBTSxJQUFJO1NBRTNCLE9BQU87O2dCQUFXLEdBQUksTUFBTyxRQUFTLE9BQU87O1FBS2pELE9BQU87O1FBQ04sU0FBVyxPQUFPLE9BQU8sc0JBQWlCLE9BQU8sT0FBTyxXQUFjLE9BQU8sT0FBTztnQkFDakYsR0FBSSxNQUFPLFlBQWE7O1lBRTlCLEdBQUksS0FBTSxNQUFPLE9BQU87OztBQUU3Qjs7OztTQUVXLElBQUk7O1FBQ1AsR0FBRyxNQUFNO2VBQ0Y7O0lBRVgsU0FBUyxVQUFVO1NBRVosT0FBTzs7UUFDVixHQUFHLE1BQU0sY0FBYyxPQUFPO2VBQ3ZCOztJQUVYO1FBRUcsT0FBTyxNQUFNLFNBQVM7O1FBRXJCLElBQUksWUFBWSxPQUFPO2FBRWhCLEVBQUU7O1lBQ0wsR0FBRyxNQUFNLGNBQWMsRUFBRTttQkFDbEI7O1FBRVgsUUFBUSxFQUFFOztJQUVkLGVBQUksSUFBSSw0QkFBUSxNQUFNO0lBRXRCLE1BQU0sSUFBSSxXQUFXLE9BQU8sT0FDeEIsS0FBTSxPQUFPLEtBQ2IsTUFBTyxPQUFPLE1BQ2QsTUFBTztRQUdSLElBQUk7O1FBQ0gsU0FBUyxJQUFJLE1BQU0sT0FBTztRQUMxQixHQUFHLE1BQU0seUJBQXdCLFVBQVksbUJBQXNCO2VBQzVELElBQUksTUFBTTs7SUFFckIsbUJBQVEsSUFBSSw0QkFBUSx5QkFBYyxJQUFJLDZCQUFTLFFBQVE7SUFDdkQsTUFBTSxPQUFPLFVBQVUsSUFBSSxNQUFPLE1BQUEsTUFBTyxLQUFNLE9BQU8sS0FBTSxNQUFPO1FBRWhFOztRQUFTLEdBQUcsSUFBSTs7V0FDbkI7OztJQUdBLFVBQVc7SUFDWCxjQUFlO0lBQ2YsWUFBYTtJQUNiLElBQUsifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/log.kode
