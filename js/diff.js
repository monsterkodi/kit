var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, first: function (o) {return o != null ? o.length ? o[0] : undefined : o}}

var diff, gitCommands, parseArgs, typePathspec

import git from "./git.js"


typePathspec = function (type)
{
    if (type.startsWith('.'))
    {
        return `*.${type.slice(1)}`
    }
    else
    {
        return type
    }
}

parseArgs = function (args, isCommit = null)
{
    var arg, n, paths, target, targets

    targets = []
    paths = []
    var list = _k_.list(args)
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        arg = list[_a_]
        if ((/^-\d+$/).test(arg))
        {
            n = Number(arg.slice(1))
            if (n < 1)
            {
                return {ok:false,message:`'${arg}' is not a commit count (it starts at 1)`}
            }
            targets.push({number:n})
            continue
        }
        if (arg.startsWith('-'))
        {
            return {ok:false,message:`'${arg}' is not a commit number`}
        }
        if (isCommit && isCommit(arg))
        {
            targets.push({rev:arg})
            continue
        }
        paths.push(typePathspec(arg))
    }
    if (targets.length > 1)
    {
        return {ok:false,message:`expected at most one commit, got ${targets.length}`}
    }
    target = targets.length > 0 ? _k_.first(targets) : null
    return {ok:true,target:target,paths:paths}
}

gitCommands = function (target, paths)
{
    var limit

    limit = paths.length > 0 ? ['--'].concat(paths) : []
    if (target)
    {
        return [['show',target].concat(limit)]
    }
    return [['diff','--staged'].concat(limit),['diff'].concat(limit)]
}

diff = function (args = [], io = console, opt = {})
{
    var cmd, code, parsed, rev, _115_31_

    if (!git.inRepo())
    {
        io.error('kit diff: not a git repository')
        return 128
    }
    parsed = parseArgs(args,git.isCommit)
    if (!parsed.ok)
    {
        io.error('kit diff: ' + parsed.message)
        return 1
    }
    rev = null
    if (parsed.target)
    {
        if ((parsed.target.number != null))
        {
            rev = git.commitAt(parsed.target.number)
            if (!rev)
            {
                io.error(`kit diff: '-${parsed.target.number}' is not a commit count (the history is shorter)`)
                return 128
            }
        }
        else
        {
            rev = parsed.target.rev
        }
    }
    var list = _k_.list(gitCommands(rev,parsed.paths))
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        cmd = list[_b_]
        code = git.runAttached(cmd)
        if (code !== 0)
        {
            return code
        }
    }
    return 0
}
export default {
    typePathspec:typePathspec,
    parseArgs:parseArgs,
    gitCommands:gitCommands,
    diff:diff
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4va29kZS9kaWZmLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUErQkE7O1FBRU8sS0FBSyxXQUFXOztvQkFBZSxLQUFLLE1BQU07Ozs7ZUFBVTs7OztBQWEzRDs7OztJQUVJO0lBQ0E7d0JBRVc7Ozs7YUFPSCxVQUFVLEtBQUs7O1lBRWYsSUFBSSxPQUFPLElBQUksTUFBTTtnQkFFbEIsSUFBSTs7d0JBQVUsR0FBSSxNQUFPLFlBQWE7O1lBRXpDLFFBQVEsTUFBTSxPQUFRO1lBQ3RCOztZQUVELElBQUksV0FBVzs7b0JBQWEsR0FBSSxNQUFPLFlBQWE7O1lBS3BELFlBQWEsU0FBUzs7WUFDckIsUUFBUSxNQUFNLElBQUs7WUFDbkI7O1FBRUosTUFBTSxLQUFLLGFBQWE7O1FBRXpCLFFBQVEsU0FBUzs7Z0JBQVUsR0FBSSxNQUFPLDRDQUE2QyxRQUFROztJQUU5RixTQUFZLFFBQVEsU0FBUyxjQUFhLFdBQWE7WUFFdEQsR0FBSSxLQUFNLE9BQVEsT0FBUSxNQUFPOzs7QUFRdEM7Ozs7SUFFSSxRQUFXLE1BQU0sU0FBUyxLQUFRLE1BQU0sT0FBTztRQUU1Qzs7aUJBQWdCLE9BQVEsUUFBUSxPQUFPOzthQUV4QyxPQUFRLFlBQVksT0FBTyxRQUFTLFFBQVEsT0FBTzs7O0FBRXpEOzs7O1NBRVcsSUFBSTs7UUFDUCxHQUFHLE1BQU07ZUFDRjs7SUFFWCxTQUFTLFVBQVUsS0FBTSxJQUFJO1NBRXRCLE9BQU87O1FBQ1YsR0FBRyxNQUFNLGVBQWUsT0FBTztlQUN4Qjs7SUFFWCxNQUFNO1FBRUgsT0FBTzs7YUFFSCxPQUFPLE9BQU87O1lBS2IsTUFBTSxJQUFJLFNBQVMsT0FBTyxPQUFPO2lCQUUxQjs7Z0JBQ0gsR0FBRyxxQkFBcUIsT0FBTyxPQUFPO3VCQUMvQjs7Ozs7WUFHWCxNQUFNLE9BQU8sT0FBTzs7O3dCQUVqQixZQUFZLElBQUssT0FBTzs7OztRQUMvQixPQUFPLElBQUksWUFBWTtZQUNwQixTQUFROzttQkFBYzs7O1dBRTdCOzs7SUFHQSxhQUFjO0lBQ2QsVUFBVztJQUNYLFlBQWE7SUFDYixLQUFNIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/diff.kode
