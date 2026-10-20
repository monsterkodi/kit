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
                return {ok:false,message:`kit diff: '${arg}' is not a commit count (it starts at 1)`}
            }
            targets.push({number:n})
            continue
        }
        if (arg.startsWith('-'))
        {
            return {ok:false,message:`kit diff: '${arg}' is not a commit number`}
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
        return {ok:false,message:`kit diff: expected at most one commit, got ${targets.length}`}
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
        io.error(parsed.message)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4va29kZS9kaWZmLmtvZGUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQXdCQSxZQUFZO0FBQ1osYUFBYTs7QUFhYjs7OztJQUVJO0lBQ0E7d0JBRVc7Ozs7YUFPSCxVQUFVLEtBQUs7O1lBRWYsSUFBSSxPQUFPLElBQUksTUFBTTtnQkFFbEIsSUFBSTs7d0JBQVUsR0FBSSxNQUFPLHNCQUF1Qjs7WUFFbkQsUUFBUSxNQUFNLE9BQVE7WUFDdEI7O1lBRUQsSUFBSSxXQUFXOztvQkFBYSxHQUFJLE1BQU8sc0JBQXVCOztZQUk5RCxRQUFPOztZQUNOLE1BQU0sS0FBSztZQUNYOztZQUVELFFBQU87O1lBQ04sTUFBTSxLQUFLO1lBQ1g7O1lBS0QsWUFBYSxTQUFTOztZQUNyQixRQUFRLE1BQU0sSUFBSztZQUNuQjs7UUFFSixNQUFNLEtBQUs7O1FBRVosUUFBUSxTQUFTOztnQkFBVSxHQUFJLE1BQU8sc0RBQXVELFFBQVE7O0lBRXhHLFNBQVksUUFBUSxTQUFTLGNBQWEsV0FBYTtZQUV0RCxHQUFJLEtBQU0sT0FBUSxPQUFRLE1BQU87OztBQVF0Qzs7OztJQUVJLFFBQVcsTUFBTSxTQUFTLEtBQVEsTUFBTSxPQUFPO1FBRTVDOztpQkFBZ0IsT0FBUSxRQUFRLE9BQU87O2FBRXhDLE9BQVEsWUFBWSxPQUFPLFFBQVMsUUFBUSxPQUFPOzs7QUFFekQ7Ozs7U0FFVyxJQUFJOztRQUNQLEdBQUcsTUFBTTtlQUNGOztJQUVYLFNBQVMsVUFBVSxLQUFNLElBQUk7U0FFdEIsT0FBTzs7UUFDVixHQUFHLE1BQU0sT0FBTztlQUNUOztJQUVYLE1BQU07UUFFSCxPQUFPOzthQUVILE9BQU8sT0FBTzs7WUFLYixNQUFNLElBQUksU0FBUyxPQUFPLE9BQU87aUJBRTFCOztnQkFDSCxHQUFHLHFCQUFxQixPQUFPLE9BQU87dUJBQy9COzs7OztZQUdYLE1BQU0sT0FBTyxPQUFPOzs7d0JBRWpCLFlBQVksSUFBSyxPQUFPOzs7O1FBQy9CLE9BQU8sSUFBSSxZQUFZO1lBQ3BCLFNBQVE7O21CQUFjOzs7V0FFN0I7OztJQUdBLFVBQVc7SUFDWCxXQUFZO0lBQ1osVUFBVztJQUNYLFlBQWE7SUFDYixLQUFNIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/diff.kode
