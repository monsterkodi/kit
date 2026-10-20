var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}}

var childRepos, status

import fs from "fs"
import path from "path"

import git from "./git.js"

import render from "./render.js"


childRepos = function (dir)
{
    var child, entries, entry, out

    entries = []
    try
    {
        entries = fs.readdirSync(dir,{withFileTypes:true})
    }
    catch (err)
    {
        return []
    }
    out = []
    var list = _k_.list(entries)
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        entry = list[_a_]
        if (entry.name.startsWith('.'))
        {
            continue
        }
        child = path.join(dir,entry.name)
        if (fs.existsSync(path.join(child,'.git')))
        {
            out.push(child)
        }
    }
    return out.sort()
}

status = function (args = [], io = console, opt = {})
{
    var child, children, code, dir, dirs, given, label, problem, report, t

    t = opt.theme
    given = args.length > 0 ? args : ['.']
    dirs = given.map(function (a)
    {
        return path.resolve(a)
    })
    code = 0
    report = function (dir)
    {
        var detail, out, res

        res = git.collectStatus(dir)
        if (res.error)
        {
            detail = res.error.stderr.trim()
            io.error('kit status: ' + (_k_.empty(detail) ? 'git status failed' : detail))
            if (code === 0)
            {
                code = res.error.code
            }
            return
        }
        out = render.renderStatus(res.data,{theme:t})
        if (out)
        {
            return io.log(out)
        }
    }
    var list = _k_.list(dirs)
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        dir = list[_b_]
        label = render.abbreviateHome(dir)
        if (!fs.existsSync(dir))
        {
            io.error(`kit status: ${label}: no such directory`)
            code = 128
            continue
        }
        problem = git.repoProblem(dir)
        if (problem)
        {
            children = childRepos(dir)
            if (children.length > 0)
            {
                var list1 = _k_.list(children)
                for (var _c_ = 0; _c_ < list1.length; _c_++)
                {
                    child = list1[_c_]
                    report(child)
                }
                continue
            }
            io.error(`kit status: ${label}: ${problem}`)
            code = 128
            continue
        }
        report(dir)
    }
    return code
}
export default {
    childRepos:childRepos,
    status:status
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL3N0YXR1cy5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFxQkE7Ozs7SUFFSTs7O1FBRUksVUFBVSxHQUFHLFlBQVksS0FBSyxjQUFlOzs7Ozs7SUFJakQ7d0JBRWE7Ozs7WUFDTixNQUFNLEtBQUssV0FBVzs7WUFBUzs7UUFDbEMsUUFBUSxLQUFLLEtBQUssSUFBSyxNQUFNO1lBQzFCLEdBQUcsV0FBVyxLQUFLLEtBQUssTUFBTzs7WUFBYyxJQUFJLEtBQUs7OztXQUU3RCxJQUFJOzs7QUFFUjs7OztJQUVJLElBQUksSUFBSTtJQUNSLFFBQVcsS0FBSyxTQUFTLElBQU8sUUFBVztJQUMzQyxPQUFPLE1BQU07O2VBQVcsS0FBSyxRQUFROztJQUNyQyxPQUFPO0lBRVA7Ozs7UUFFSSxNQUFNLElBQUksY0FBYztZQUVyQixJQUFJOztZQUNILFNBQVMsSUFBSSxNQUFNLE9BQU87WUFDMUIsR0FBRyxNQUFNLDRCQUEyQixVQUFZLHNCQUF5QjtnQkFDdEUsU0FBUTs7Z0JBQU8sT0FBTyxJQUFJLE1BQU07Ozs7UUFHdkMsTUFBTSxPQUFPLGFBQWEsSUFBSSxNQUFPLE1BQU87WUFDekM7O21CQUFTLEdBQUcsSUFBSTs7O3dCQUVaOzs7O1FBRVAsUUFBUSxPQUFPLGVBQWU7YUFFdkIsR0FBRyxXQUFXOztZQUNqQixHQUFHLHFCQUFxQjtZQUN4QixPQUFPO1lBQ1A7O1FBRUosVUFBVSxJQUFJLFlBQVk7WUFFdkI7O1lBRUMsV0FBVyxXQUFXO2dCQUVuQixTQUFTLFNBQVM7O3FDQUNKOzs7O29CQUNULE9BQU87O2dCQUNYOztZQUVKLEdBQUcscUJBQXFCLFVBQVU7WUFDbEMsT0FBTztZQUNQOztRQUVKLE9BQU87O1dBRVg7OztJQUdBLFdBQVk7SUFDWixPQUFRIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/status.kode
