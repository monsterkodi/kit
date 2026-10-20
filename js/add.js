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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2FkZC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFvQkE7O1FBQXdCLE1BQU0sU0FBUzs7Z0JBQVEsT0FBTyxPQUFPOzs7O2dCQUFhLE1BQU87Ozs7QUFFakY7Ozs7U0FFVyxJQUFJOztRQUNQLEdBQUcsTUFBTTtlQUNGOztJQUVYLElBQUksSUFBSSxJQUFJLFFBQVE7U0FFYixFQUFFOztRQUNMLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsTUFBTSx5QkFBd0IsVUFBWSxtQkFBc0I7ZUFDNUQsRUFBRTs7SUFFYixNQUFNLElBQUk7SUFFVixNQUFNLE9BQU8sYUFBYSxJQUFJLEtBQU07UUFDakM7O1FBQVMsR0FBRyxJQUFJOztXQUVuQjs7O0lBR0EsUUFBUztJQUNULElBQUsifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/add.kode
