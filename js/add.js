var _k_ = {empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}}

var add, addArgs

import git from "./git.js"

import render from "./render.js"


addArgs = function (paths)
{
    if (paths.length > 0)
    {
        return ['add'].concat(paths)
    }
    else
    {
        return ['add','.']
    }
}

add = function (paths, io = console, opt = {})
{
    var detail, out, r, res

    if (!git.inRepo())
    {
        io.error('kit add: not a git repository')
        return 128
    }
    r = git.run(addArgs(paths))
    if (!r.ok)
    {
        detail = r.stderr.trim()
        io.error('kit add: ' + (_k_.empty(detail) ? 'git add failed' : detail))
        return r.code
    }
    res = git.collectStatus()
    out = render.renderStatus(res.data,opt)
    if (out)
    {
        io.log(out)
    }
    return 0
}
export default {
    addArgs:addArgs,
    add:add
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2FkZC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09BaUJNLFVBQUE7O09BQ0EsYUFBQTs7O0FBRU4sb0JBQVc7O1FBQWEsTUFBTSxTQUFTOztnQkFBUSxPQUFPLE9BQU87Ozs7Z0JBQWEsTUFBTzs7OztBQUVqRixnQkFBTyxPQUFPLEtBQUcsU0FBUzs7OztTQUVmLElBQUk7O1FBQ1AsR0FBRyxNQUFNO2VBQ0Y7O0lBRVgsSUFBSSxJQUFJLElBQUksUUFBUTtTQUViLEVBQUU7O1FBQ0wsU0FBUyxFQUFFLE9BQU87UUFDbEIsR0FBRyxNQUFNLHlCQUF3QixVQUFZLG1CQUFzQjtlQUM1RCxFQUFFOztJQUViLE1BQU0sSUFBSTtJQUVWLE1BQU0sT0FBTyxhQUFhLElBQUksS0FBTTtRQUNqQzs7UUFBUyxHQUFHLElBQUk7O1dBRW5COzs7SUFHQSxRQUFTO0lBQ1QsSUFBSyJ9
//# sourceURL=../kode/add.kode
