var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}}

var childRepos, status

import fs from 'node:fs'
import path from 'node:path'
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL3N0YXR1cy5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09BbUNPLEdBQUcsS0FBSztPQUNSLEtBQUssS0FBSzs7Ozs7O0FBZWpCOzs7O0lBRUk7OztRQUVJLFVBQVUsR0FBRyxZQUFZLEtBQUssY0FBZTs7Ozs7O0lBS2pEO3dCQUVhOzs7O1lBQ04sTUFBTSxLQUFLLFdBQVc7O1lBQVM7O1FBQ2xDLFFBQVEsS0FBSyxLQUFLLElBQUssTUFBTTtZQUMxQixHQUFHLFdBQVcsS0FBSyxLQUFLLE1BQU87O1lBQWMsSUFBSSxLQUFLOzs7V0FFN0QsSUFBSTs7O0FBRVI7Ozs7SUFFSSxJQUFJLElBQUk7SUFDUixRQUFXLEtBQUssU0FBUyxJQUFPLFFBQVc7SUFDM0MsT0FBTyxNQUFNOztlQUFXLEtBQUssUUFBUTs7SUFDckMsT0FBTztJQUVQOzs7O1FBRUksTUFBTSxJQUFJLGNBQWM7WUFFckIsSUFBSTs7WUFDSCxTQUFTLElBQUksTUFBTSxPQUFPO1lBQzFCLEdBQUcsTUFBTSw0QkFBMkIsVUFBWSxzQkFBeUI7Z0JBQ3RFLFNBQVE7O2dCQUFPLE9BQU8sSUFBSSxNQUFNOzs7O1FBR3ZDLE1BQU0sT0FBTyxhQUFhLElBQUksTUFBTyxNQUFPO1lBQ3pDOzttQkFBUyxHQUFHLElBQUk7Ozt3QkFFWjs7OztRQUVQLFFBQVEsT0FBTyxlQUFlO2FBRXZCLEdBQUcsV0FBVzs7WUFDakIsR0FBRyxxQkFBcUI7WUFDeEIsT0FBTztZQUNQOztRQUVKLFVBQVUsSUFBSSxZQUFZO1lBRXZCOztZQUVDLFdBQVcsV0FBVztnQkFFbkIsU0FBUyxTQUFTOztxQ0FDSjs7OztvQkFDVCxPQUFPOztnQkFDWDs7WUFFSixHQUFHLHFCQUFxQixVQUFVO1lBQ2xDLE9BQU87WUFDUDs7UUFFSixPQUFPOztXQUVYOzs7SUFHQSxXQUFZO0lBQ1osT0FBUSJ9
//# sourceURL=file://kode/status.kode
