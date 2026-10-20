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
    var detail, out, parsed, res, width, _67_22_, _67_49_

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
    width = ((_67_22_=env.width) != null ? _67_22_ : terminalWidth(((_67_49_=env.stream) != null ? _67_49_ : process.stdout)))
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2xvZy5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFrQkE7Ozs7SUFFSSxPQUFPO0lBQ1A7d0JBRVc7Ozs7bUJBRUosS0FBUSxLQUFLOztZQUNaLE9BQU87O2tCQUNGLFNBQVMsS0FBSzs7WUFDbkIsUUFBUSxLQUFLOzs7O29CQUVYLEdBQUksTUFBTyxxQkFBc0I7OztRQUV4QyxRQUFRLFNBQVM7O2dCQUNkLEdBQUksTUFBTywyREFBNEQsUUFBUTs7WUFFckYsR0FBSSxLQUNKLE1BQVUsUUFBUSxTQUFZLE9BQU8sUUFBUSxNQUFTLEtBQ3RELEtBQU07OztBQUlWOzs7O0lBRUksUUFBTyxjQUFBLElBQUs7UUFDVCxPQUFPLFVBQVUsU0FBVSxPQUFPOztlQUFTOztXQUM5QyxPQUFPOzs7QUFFWDs7OztTQUVXLElBQUk7O1FBQ1AsR0FBRyxNQUFNO2VBQ0Y7O0lBRVgsU0FBUyxVQUFVO1NBRVosT0FBTzs7UUFDVixHQUFHLE1BQU0sT0FBTztlQUNUOztJQUVYLE1BQU0sSUFBSSxXQUFXLE9BQU8sT0FBUSxLQUFNLE9BQU87UUFFOUMsSUFBSTs7UUFDSCxTQUFTLElBQUksTUFBTSxPQUFPO1FBQzFCLEdBQUcsTUFBTSx5QkFBd0IsVUFBWSxtQkFBc0I7ZUFDNUQsSUFBSSxNQUFNOztJQUVyQixrQkFBUSxJQUFJLDJCQUFRLHdCQUFjLElBQUksNEJBQVMsUUFBUTtJQUN2RCxNQUFNLE9BQU8sVUFBVSxJQUFJLE1BQU8sTUFBQSxNQUFPLEtBQU0sT0FBTyxLQUFNLE1BQU8sSUFBSTtRQUVwRTs7UUFBUyxHQUFHLElBQUk7O1dBQ25COzs7SUFHQSxVQUFXO0lBQ1gsY0FBZTtJQUNmLElBQUsifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/log.kode
