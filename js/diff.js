var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, first: function (o) {return o != null ? o.length ? o[0] : undefined : o}}

var changeCommands, diff, gitCommands, matchesNothing, parseArgs, typePathspec

import git from "./git.js"

import render from "./render.js"


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

changeCommands = function (target, paths)
{
    var limit

    limit = ['--'].concat(paths)
    if (target)
    {
        return [['show','--format=','--name-only',target].concat(limit)]
    }
    return [['diff','--staged','--name-only'].concat(limit),['diff','--name-only'].concat(limit)]
}

matchesNothing = function (target, paths)
{
    var cmd, r

    var list = _k_.list(changeCommands(target,paths))
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        cmd = list[_b_]
        r = git.run(cmd)
        if (!r.ok || r.stdout.trim())
        {
            return false
        }
    }
    return true
}

diff = function (args = [], io = console, opt = {})
{
    var cmd, code, parsed, rev, _136_31_

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
    if (parsed.paths.length > 0 && matchesNothing(rev,parsed.paths))
    {
        io.log(render.renderNoChanges(parsed.paths,opt))
        return 0
    }
    var list = _k_.list(gitCommands(rev,parsed.paths))
    for (var _c_ = 0; _c_ < list.length; _c_++)
    {
        cmd = list[_c_]
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
    changeCommands:changeCommands,
    diff:diff
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4va29kZS9kaWZmLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7T0FvQk0sVUFBQTs7T0FDQSxhQUFBOzs7QUFXTix5QkFBZ0I7O1FBRVQsS0FBSyxXQUFXOztvQkFBZSxLQUFLLE1BQU07Ozs7ZUFBVTs7OztBQWEzRCxzQkFBYSxNQUFNLFdBQVM7Ozs7SUFFeEI7SUFDQTt3QkFFVzs7O1FBQVA7YUFPSSxVQUFVLEtBQUs7O1lBRWYsSUFBSSxPQUFPLElBQUksTUFBTTtnQkFFbEIsSUFBSTs7d0JBQVUsR0FBSSxNQUFPLFlBQWE7O1lBRXpDLFFBQVEsTUFBTSxPQUFRO1lBQ3RCOztZQUVELElBQUksV0FBVzs7b0JBQWEsR0FBSSxNQUFPLFlBQWE7O1lBS3BELFlBQWEsU0FBUzs7WUFDckIsUUFBUSxNQUFNLElBQUs7WUFDbkI7O1FBRUosTUFBTSxLQUFLLGFBQWE7O1FBRXpCLFFBQVEsU0FBUzs7Z0JBQVUsR0FBSSxNQUFPLDRDQUE2QyxRQUFROztJQUU5RixTQUFZLFFBQVEsU0FBUyxjQUFhLFdBQWE7WUFFdEQsR0FBSSxLQUFNLE9BQVEsT0FBUSxNQUFPOzs7QUFRdEMsd0JBQWUsUUFBUTs7OztJQUVuQixRQUFXLE1BQU0sU0FBUyxLQUFRLE1BQU0sT0FBTztRQUU1Qzs7aUJBQWdCLE9BQVEsUUFBUSxPQUFPOzthQUV4QyxPQUFRLFlBQVksT0FBTyxRQUFTLFFBQVEsT0FBTzs7O0FBTXpELDJCQUFrQixRQUFROzs7O0lBRXRCLFNBQVMsTUFBTSxPQUFPO1FBRW5COztpQkFBZ0IsT0FBUSxZQUFhLGNBQWUsUUFBUSxPQUFPOzthQUVwRSxPQUFRLFdBQVksZUFBZSxPQUFPLFFBQVMsT0FBUSxlQUFlLE9BQU87OztBQUV2RiwyQkFBa0IsUUFBUTs7Ozt3QkFFWCxlQUFlLE9BQVE7OztRQUE5QjtRQUNBLElBQUksSUFBSSxJQUFJO2FBQ0wsRUFBRSxNQUFNLEVBQUUsT0FBTzs7bUJBQWM7OztXQUUxQzs7O0FBRUosaUJBQVEsV0FBUyxLQUFHLFNBQVM7Ozs7U0FFbEIsSUFBSTs7UUFDUCxHQUFHLE1BQU07ZUFDRjs7SUFFWCxTQUFTLFVBQVUsS0FBTSxJQUFJO1NBRXRCLE9BQU87O1FBQ1YsR0FBRyxNQUFNLGVBQWUsT0FBTztlQUN4Qjs7SUFFWCxNQUFNO1FBRUgsT0FBTzs7YUFFSCxPQUFPLE9BQU87O1lBS2IsTUFBTSxJQUFJLFNBQVMsT0FBTyxPQUFPO2lCQUUxQjs7Z0JBQ0gsR0FBRyxxQkFBcUIsT0FBTyxPQUFPO3VCQUMvQjs7Ozs7WUFHWCxNQUFNLE9BQU8sT0FBTzs7O1FBRXpCLE9BQU8sTUFBTSxTQUFTLEtBQU0sZUFBZSxJQUFLLE9BQU87O1FBQ3RELEdBQUcsSUFBSSxPQUFPLGdCQUFnQixPQUFPLE1BQU87ZUFDckM7O3dCQUVBLFlBQVksSUFBSyxPQUFPOzs7UUFBL0I7UUFDQSxPQUFPLElBQUksWUFBWTtZQUNwQixTQUFROzttQkFBYzs7O1dBRTdCOzs7SUFHQSxhQUFjO0lBQ2QsVUFBVztJQUNYLFlBQWE7SUFDYixlQUFnQjtJQUNoQixLQUFNIn0=
//# sourceURL=../kode/diff.kode
