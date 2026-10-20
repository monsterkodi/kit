var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, first: function (o) {return o != null ? o.length ? o[0] : undefined : o}}

var diff, gitCommands, KODE_FILES, KODE_TREE, parseArgs

import git from "./git.js"

KODE_TREE = 'kode'
KODE_FILES = '*.kode'

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
        if (arg === 'kode')
        {
            paths.push(KODE_TREE)
            continue
        }
        if (arg === '.kode')
        {
            paths.push(KODE_FILES)
            continue
        }
        if (isCommit && isCommit(arg))
        {
            targets.push({rev:arg})
            continue
        }
        paths.push(arg)
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
    var cmd, code, parsed, rev, _117_31_

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
    KODE_TREE:KODE_TREE,
    KODE_FILES:KODE_FILES,
    parseArgs:parseArgs,
    gitCommands:gitCommands,
    diff:diff
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4va29kZS9kaWZmLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQXdCQSxZQUFZO0FBQ1osYUFBYTs7QUFhYjs7OztJQUVJO0lBQ0E7d0JBRVc7Ozs7YUFPSCxVQUFVLEtBQUs7O1lBRWYsSUFBSSxPQUFPLElBQUksTUFBTTtnQkFFbEIsSUFBSTs7d0JBQVUsR0FBSSxNQUFPLFlBQWE7O1lBRXpDLFFBQVEsTUFBTSxPQUFRO1lBQ3RCOztZQUVELElBQUksV0FBVzs7b0JBQWEsR0FBSSxNQUFPLFlBQWE7O1lBSXBELFFBQU87O1lBQ04sTUFBTSxLQUFLO1lBQ1g7O1lBRUQsUUFBTzs7WUFDTixNQUFNLEtBQUs7WUFDWDs7WUFLRCxZQUFhLFNBQVM7O1lBQ3JCLFFBQVEsTUFBTSxJQUFLO1lBQ25COztRQUVKLE1BQU0sS0FBSzs7UUFFWixRQUFRLFNBQVM7O2dCQUFVLEdBQUksTUFBTyw0Q0FBNkMsUUFBUTs7SUFFOUYsU0FBWSxRQUFRLFNBQVMsY0FBYSxXQUFhO1lBRXRELEdBQUksS0FBTSxPQUFRLE9BQVEsTUFBTzs7O0FBUXRDOzs7O0lBRUksUUFBVyxNQUFNLFNBQVMsS0FBUSxNQUFNLE9BQU87UUFFNUM7O2lCQUFnQixPQUFRLFFBQVEsT0FBTzs7YUFFeEMsT0FBUSxZQUFZLE9BQU8sUUFBUyxRQUFRLE9BQU87OztBQUV6RDs7OztTQUVXLElBQUk7O1FBQ1AsR0FBRyxNQUFNO2VBQ0Y7O0lBRVgsU0FBUyxVQUFVLEtBQU0sSUFBSTtTQUV0QixPQUFPOztRQUNWLEdBQUcsTUFBTSxlQUFlLE9BQU87ZUFDeEI7O0lBRVgsTUFBTTtRQUVILE9BQU87O2FBRUgsT0FBTyxPQUFPOztZQUtiLE1BQU0sSUFBSSxTQUFTLE9BQU8sT0FBTztpQkFFMUI7O2dCQUNILEdBQUcscUJBQXFCLE9BQU8sT0FBTzt1QkFDL0I7Ozs7O1lBR1gsTUFBTSxPQUFPLE9BQU87Ozt3QkFFakIsWUFBWSxJQUFLLE9BQU87Ozs7UUFDL0IsT0FBTyxJQUFJLFlBQVk7WUFDcEIsU0FBUTs7bUJBQWM7OztXQUU3Qjs7O0lBR0EsVUFBVztJQUNYLFdBQVk7SUFDWixVQUFXO0lBQ1gsWUFBYTtJQUNiLEtBQU0ifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/diff.kode
