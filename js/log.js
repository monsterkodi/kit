var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}}

var log, parseArgs, patchPaths, terminalWidth

import git from "./git.js"

import render from "./render.js"

import diff from "./diff.js"

import theme from "./theme.js"


parseArgs = function (args)
{
    var arg, files, long, numbers, patch, paths

    long = false
    files = false
    patch = false
    numbers = []
    paths = []
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
            continue
        }
        if (_k_.in(arg,['-d','--diff']))
        {
            patch = true
            continue
        }
        if ((/^\d+$/).test(arg))
        {
            numbers.push(arg)
            continue
        }
        if (patch)
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
    return {ok:true,count:numbers.length ? Number(numbers[0]) : null,long:long,files:files,patch:patch,paths:paths}
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

patchPaths = function (args)
{
    var label, parsed, _93_39_

    parsed = diff.parseArgs(args,git.isCommit)
    if (!parsed.ok)
    {
        return {ok:false,message:parsed.message}
    }
    if (parsed.target)
    {
        label = (parsed.target.number != null) ? `-${parsed.target.number}` : parsed.target.rev
        return {ok:false,message:`'${label}' is a commit, and -d takes paths`}
    }
    return {ok:true,paths:parsed.paths}
}

log = function (args, io = console, env = {})
{
    var detail, out, p, parsed, paths, res, t, width, _122_18_, _137_22_, _137_49_

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
        p = patchPaths(parsed.paths)
        if (!p.ok)
        {
            io.error('kit log: ' + p.message)
            return 1
        }
        paths = p.paths
    }
    t = ((_122_18_=env.theme) != null ? _122_18_ : theme.theme)
    res = git.collectLog(parsed.count,{long:parsed.long,files:parsed.files,patch:parsed.patch,paths:paths,colour:t.enabled})
    if (res.error)
    {
        detail = res.error.stderr.trim()
        io.error('kit log: ' + (_k_.empty(detail) ? 'git log failed' : detail))
        return res.error.code
    }
    width = ((_137_22_=env.width) != null ? _137_22_ : terminalWidth(((_137_49_=env.stream) != null ? _137_49_ : process.stdout)))
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
    patchPaths:patchPaths,
    log:log
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2xvZy5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBeUJBOzs7O0lBRUksT0FBTztJQUNQLFFBQVE7SUFDUixRQUFRO0lBQ1I7SUFDQTt3QkFFVzs7OzttQkFFSixLQUFRLEtBQUs7O1lBQ1osT0FBTztZQUNQOzttQkFFRCxLQUFRLEtBQUs7O1lBQ1osUUFBUTtZQUNSOzttQkFFRCxLQUFRLEtBQUs7O1lBQ1osUUFBUTtZQUNSOzthQUlBLFNBQVMsS0FBSzs7WUFDZCxRQUFRLEtBQUs7WUFDYjs7WUFLRDs7WUFDQyxNQUFNLEtBQUs7WUFDWDs7Z0JBRUYsR0FBSSxNQUFPLFlBQWE7O1FBRTNCLFFBQVEsU0FBUzs7Z0JBQ2QsR0FBSSxNQUFPLGtEQUFtRCxRQUFROztZQUU1RSxHQUFJLEtBQ0osTUFBVSxRQUFRLFNBQVksT0FBTyxRQUFRLE1BQVMsS0FDdEQsS0FBTSxLQUNOLE1BQU8sTUFDUCxNQUFPLE1BQ1AsTUFBTzs7O0FBSVg7Ozs7SUFFSSxRQUFPLGNBQUEsSUFBSztRQUNULE9BQU8sVUFBVSxTQUFVLE9BQU87O2VBQVM7O1dBQzlDLE9BQU87OztBQUlYOzs7O0lBRUksU0FBUyxLQUFLLFVBQVUsS0FBTSxJQUFJO1NBRTNCLE9BQU87O2dCQUFXLEdBQUksTUFBTyxRQUFTLE9BQU87O1FBS2pELE9BQU87O1FBQ04sU0FBVyxPQUFPLE9BQU8sc0JBQWlCLE9BQU8sT0FBTyxXQUFjLE9BQU8sT0FBTztnQkFDakYsR0FBSSxNQUFPLFlBQWE7O1lBRTlCLEdBQUksS0FBTSxNQUFPLE9BQU87OztBQUU3Qjs7OztTQUVXLElBQUk7O1FBQ1AsR0FBRyxNQUFNO2VBQ0Y7O0lBRVgsU0FBUyxVQUFVO1NBRVosT0FBTzs7UUFDVixHQUFHLE1BQU0sY0FBYyxPQUFPO2VBQ3ZCOztJQUVYO1FBRUcsT0FBTyxNQUFNLFNBQVM7O1FBRXJCLElBQUksV0FBVyxPQUFPO2FBRWYsRUFBRTs7WUFDTCxHQUFHLE1BQU0sY0FBYyxFQUFFO21CQUNsQjs7UUFFWCxRQUFRLEVBQUU7O0lBRWQsZUFBSSxJQUFJLDRCQUFRLE1BQU07SUFFdEIsTUFBTSxJQUFJLFdBQVcsT0FBTyxPQUN4QixLQUFNLE9BQU8sS0FDYixNQUFPLE9BQU8sTUFDZCxNQUFPLE9BQU8sTUFDZCxNQUFPLE1BQ1AsT0FBUSxFQUFFO1FBR1gsSUFBSTs7UUFDSCxTQUFTLElBQUksTUFBTSxPQUFPO1FBQzFCLEdBQUcsTUFBTSx5QkFBd0IsVUFBWSxtQkFBc0I7ZUFDNUQsSUFBSSxNQUFNOztJQUVyQixtQkFBUSxJQUFJLDRCQUFRLHlCQUFjLElBQUksNkJBQVMsUUFBUTtJQUN2RCxNQUFNLE9BQU8sVUFBVSxJQUFJLE1BQU8sTUFBQSxNQUFPLEtBQU0sT0FBTyxLQUFNLE1BQU87UUFFaEU7O1FBQVMsR0FBRyxJQUFJOztXQUNuQjs7O0lBR0EsVUFBVztJQUNYLGNBQWU7SUFDZixXQUFZO0lBQ1osSUFBSyJ9
//# sourceURL=file:///home/kodi/s/kit/kode/log.kode
