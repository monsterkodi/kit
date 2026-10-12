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