var _k_ = {empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}}

var at, capture, collectLog, collectStatus, gitEnv, hasCommits, inRepo, LOG_DATE, LOG_FORMAT_LONG, LOG_FORMAT_SHORT, LOG_STRIDE, MAXBUFFER, parseLog, parseStatusV2, relativeTo, relativise, repoProblem, run, showPrefix, showToplevel, stagedCount

import cp from 'node:child_process'
MAXBUFFER = 64 * 1024 * 1024

gitEnv = function ()
{
    return Object.assign({},process.env,{GIT_PAGER:'cat',PAGER:'cat'})
}

run = function (args, opt = {})
{
    var opts, r, _53_21_, _53_62_, _53_85_

    opts = {encoding:'utf8',maxBuffer:MAXBUFFER,env:gitEnv()}
    opts = Object.assign(opts,opt)
    r = cp.spawnSync('git',args,opts)
    if (r.error)
    {
        return {code:1,ok:false,stdout:'',stderr:String(r.error.message)}
    }
    return {code:((_53_21_=r.status) != null ? _53_21_ : 1),ok:r.status === 0,stdout:((_53_62_=r.stdout) != null ? _53_62_ : ''),stderr:((_53_85_=r.stderr) != null ? _53_85_ : '')}
}

capture = function (args)
{
    var opts

    opts = {encoding:'utf8',maxBuffer:MAXBUFFER,env:gitEnv()}
    return cp.execFileSync('git',args,opts)
}

at = function (dir)
{
    if (dir)
    {
        return {cwd:dir}
    }
    else
    {
        return {}
    }
}

repoProblem = function (dir)
{
    var r

    r = run(['rev-parse','--is-inside-work-tree'],at(dir))
    if (!r.ok)
    {
        return 'not a git repository'
    }
    if (r.stdout.trim() !== 'true')
    {
        return 'no work tree'
    }
    return ''
}

inRepo = function (dir)
{
    return repoProblem(dir) === ''
}

parseStatusV2 = function (raw)
{
    var fields, head, i, kind, m, orig, out, parts, path, rec, rest, x, xy, y, _159_31_

    out = {branch:null,upstream:null,ahead:0,behind:0,detached:false,staged:[],unstaged:[],untracked:[]}
    fields = raw.split('\0')
    for (var _a_ = i = 0, _b_ = fields.length; (_a_ <= _b_ ? i < fields.length : i > fields.length); (_a_ <= _b_ ? ++i : --i))
    {
        rec = fields[i]
        if (_k_.empty(rec))
        {
            continue
        }
        if (rec.startsWith('# branch.oid'))
        {
            out.oid = rec.slice('# branch.oid '.length).trim()
            continue
        }
        if (rec.startsWith('# branch.head'))
        {
            head = rec.slice('# branch.head '.length).trim()
            out.detached = head === '(detached)'
            out.branch = out.detached ? null : head
            continue
        }
        if (rec.startsWith('# branch.upstream'))
        {
            out.upstream = rec.slice('# branch.upstream '.length).trim()
            continue
        }
        if (rec.startsWith('# branch.ab'))
        {
            m = rec.slice('# branch.ab '.length).trim().match(/^\+(\d+)\x20-(\d+)$/)
            if (m)
            {
                out.ahead = Number(m[1])
                out.behind = Number(m[2])
            }
            continue
        }
        if (rec.startsWith('#'))
        {
            continue
        }
        if (rec.startsWith('?'))
        {
            out.untracked.push({path:rec.slice(2),code:'?'})
            continue
        }
        if (rec.startsWith('!'))
        {
            continue
        }
        kind = rec[0]
        rest = rec.slice(2)
        if (_k_.in(kind,['1','u']))
        {
            parts = rest.split(' ')
            xy = parts[0]
            path = parts.slice(7).join(' ')
            x = xy[0]
            y = xy[1]
            if (x !== '.')
            {
                out.staged.push({path:path,code:x})
            }
            if (y !== '.')
            {
                out.unstaged.push({path:path,code:y})
            }
            continue
        }
        if (kind === '2')
        {
            parts = rest.split(' ')
            xy = parts[0]
            path = parts.slice(8).join(' ')
            orig = ((_159_31_=fields[++i]) != null ? _159_31_ : '')
            x = xy[0]
            y = xy[1]
            if (x !== '.')
            {
                out.staged.push({path:path,code:x,orig:orig})
            }
            if (y !== '.')
            {
                out.unstaged.push({path:path,code:y,orig:orig})
            }
            continue
        }
    }
    return out
}

showPrefix = function (dir)
{
    var r

    r = run(['rev-parse','--show-prefix'],at(dir))
    if (!r.ok)
    {
        return ''
    }
    return r.stdout.trim()
}

showToplevel = function (dir)
{
    var r

    r = run(['rev-parse','--show-toplevel'],at(dir))
    if (!r.ok)
    {
        return ''
    }
    return r.stdout.trim()
}

relativise = function (data, prefix)
{
    var fix, out

    if (!prefix)
    {
        return data
    }
    out = Object.assign({},data)
    fix = function (items)
    {
        return items.map(function (item)
        {
            var next, rel

            rel = relativeTo(item.path,prefix)
            if (rel === item.path)
            {
                return item
            }
            next = Object.assign({},item,{path:rel})
            delete next.orig
            return next
        })
    }
    out.staged = fix(data.staged)
    out.unstaged = fix(data.unstaged)
    out.untracked = fix(data.untracked)
    return out
}

relativeTo = function (path, prefix)
{
    var acc, cut, up

    if (!prefix)
    {
        return path
    }
    if (path.startsWith(prefix))
    {
        return path.slice(prefix.length)
    }
    acc = prefix.replace(/\/$/,'')
    up = 0
    while (true)
    {
        if (acc !== '' && path.startsWith(acc + '/'))
        {
            return '../'.repeat(up) + path.slice(acc.length + 1)
        }
        cut = acc.lastIndexOf('/')
        acc = cut === -1 ? '' : acc.slice(0,cut)
        up += 1
        if (acc === '')
        {
            return '../'.repeat(up) + path
        }
    }
}

collectStatus = function (dir)
{
    var data, r

    r = run(['status','--porcelain=v2','-z','-b','-unormal'],at(dir))
    if (!r.ok)
    {
        return {error:r,data:null}
    }
    data = relativise(parseStatusV2(r.stdout),showPrefix(dir))
    data.root = showToplevel(dir)
    return {error:null,data:data}
}

stagedCount = function ()
{
    var r

    r = run(['diff','--cached','--name-only'])
    if (!r.ok)
    {
        return 0
    }
    return r.stdout.split('\n').filter(Boolean).length
}
LOG_DATE = 'format-local:%b %e %H:%M'
LOG_FORMAT_SHORT = '%x00%h%x00%ad%x00%an%x00%s%x00'
LOG_FORMAT_LONG = '%x00%h%x00%ad%x00%an%x00%B%x00'
LOG_STRIDE = 5

parseLog = function (raw)
{
    var date, fields, hash, i, message, name, out, text

    fields = raw.split('\0')
    out = []
    i = 1
    while (i + 4 <= fields.length)
    {
        var _c_ = fields.slice(i,i + 4); hash = _c_[0]; date = _c_[1]; name = _c_[2]; message = _c_[3]

        if (!_k_.empty(hash))
        {
            text = String((message != null ? message : '')).replace(/\s+$/,'')
            out.push({hash:hash.trim(),date:date.trim(),name:name.trim(),subject:text,body:text})
        }
        i += LOG_STRIDE
    }
    return out
}

hasCommits = function ()
{
    return run(['rev-parse','--verify','HEAD']).ok
}

collectLog = function (count = null, opt = {})
{
    var args, format, long, r, _308_20_

    long = ((_308_20_=opt.long) != null ? _308_20_ : false)
    if (!hasCommits())
    {
        return {error:null,data:[]}
    }
    format = long ? LOG_FORMAT_LONG : LOG_FORMAT_SHORT
    args = ['log',`--format=${format}`,`--date=${LOG_DATE}`,'--reverse']
    if (count !== null)
    {
        args.push('-n',String(count))
    }
    r = run(args)
    if (!r.ok)
    {
        return {error:r,data:null}
    }
    return {error:null,data:parseLog(r.stdout)}
}
export default {
    run:run,
    capture:capture,
    repoProblem:repoProblem,
    inRepo:inRepo,
    parseStatusV2:parseStatusV2,
    showPrefix:showPrefix,
    showToplevel:showToplevel,
    relativise:relativise,
    relativeTo:relativeTo,
    collectStatus:collectStatus,
    stagedCount:stagedCount,
    hasCommits:hasCommits,
    collectLog:collectLog,
    parseLog:parseLog,
    LOG_DATE:LOG_DATE
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0LmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2dpdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09BeUJPLEdBQUcsS0FBSztBQUlmLFlBQVksS0FBSyxPQUFPOztBQU94Qjs7V0FBWSxPQUFPLFVBQVcsUUFBUSxLQUFNLFVBQVcsTUFBTyxNQUFPOzs7QUFFckU7Ozs7SUFFSSxRQUNJLFNBQVUsT0FDVixVQUFXLFVBQ1gsSUFBSztJQUVULE9BQU8sT0FBTyxPQUFPLEtBQU07SUFFM0IsSUFBSSxHQUFHLFVBQVUsTUFBTyxLQUFNO1FBRTNCLEVBQUU7O2dCQUNDLEtBQU0sRUFBRyxHQUFJLE1BQU8sT0FBUSxHQUFJLE9BQVEsT0FBTyxFQUFFLE1BQU07O1lBRTNELGVBQU0sRUFBRSw0QkFBUyxHQUFHLEdBQUksRUFBRSxXQUFVLEVBQUcsaUJBQVEsRUFBRSw0QkFBUyxJQUFJLGlCQUFRLEVBQUUsNEJBQVM7OztBQUV2Rjs7OztJQUVJLFFBQ0ksU0FBVSxPQUNWLFVBQVcsVUFDWCxJQUFLO1dBRVQsR0FBRyxhQUFhLE1BQU8sS0FBTTs7O0FBRWpDOztRQUFpQjs7Z0JBQVUsSUFBSzs7Ozs7Ozs7QUFFaEM7Ozs7SUFFSSxJQUFJLEtBQUssWUFBYSx5QkFBMEIsR0FBRztTQUM1QyxFQUFFOztlQUFVOztRQUNoQixFQUFFLE9BQU8sV0FBVTs7ZUFBYzs7V0FDcEM7OztBQUVKOztXQUFrQixZQUFZLFNBQVE7OztBQVl0Qzs7OztJQUVJLE9BQ0ksT0FBUSxLQUNSLFNBQVUsS0FDVixNQUFPLEVBQ1AsT0FBUSxFQUNSLFNBQVUsTUFDVixVQUNBLFlBQ0E7SUFFSixTQUFTLElBQUksTUFBTTt1QkFFVixTQUFJLE9BQU8sMEJBQVAsT0FBTyxhQUFQLE9BQU87O1FBRWhCLE1BQU0sT0FBTztzQkFDSjs7WUFBUzs7WUFFZixJQUFJLFdBQVc7O1lBQ2QsSUFBSSxNQUFNLElBQUksTUFBTSxnQkFBZ0IsUUFBUTtZQUM1Qzs7WUFFRCxJQUFJLFdBQVc7O1lBQ2QsT0FBTyxJQUFJLE1B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
//# sourceURL=file://kode/git.kode
