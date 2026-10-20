var _k_ = {empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}}

var at, capture, collectLog, collectStatus, commitAt, gitEnv, hasCommits, inRepo, isCommit, LOG_DATE, LOG_FORMAT_LONG, LOG_FORMAT_SHORT, LOG_STRIDE, MAXBUFFER, parseLog, parseStatusV2, relativeTo, relativise, repoProblem, run, runAttached, showPrefix, showToplevel, stagedCount

import child_process from "child_process"

MAXBUFFER = 64 * 1024 * 1024

gitEnv = function ()
{
    return Object.assign({},process.env,{GIT_PAGER:'cat',PAGER:'cat'})
}

run = function (args, opt = {})
{
    var opts, r, _40_21_, _40_62_, _40_85_

    opts = {encoding:'utf8',maxBuffer:MAXBUFFER,env:gitEnv()}
    opts = Object.assign(opts,opt)
    r = child_process.spawnSync('git',args,opts)
    if (r.error)
    {
        return {code:1,ok:false,stdout:'',stderr:String(r.error.message)}
    }
    return {code:((_40_21_=r.status) != null ? _40_21_ : 1),ok:r.status === 0,stdout:((_40_62_=r.stdout) != null ? _40_62_ : ''),stderr:((_40_85_=r.stderr) != null ? _40_85_ : '')}
}

capture = function (args)
{
    var opts

    opts = {encoding:'utf8',maxBuffer:MAXBUFFER,env:gitEnv()}
    return child_process.execFileSync('git',args,opts)
}

runAttached = function (args)
{
    var r, _62_13_

    r = child_process.spawnSync('git',args,{stdio:'inherit'})
    return ((_62_13_=r.status) != null ? _62_13_ : 1)
}

isCommit = function (token)
{
    var r

    r = run(['rev-parse','--verify','--quiet',`${token}^{commit}`])
    return r.ok
}

commitAt = function (n)
{
    var r, rev

    rev = n === 1 ? 'HEAD' : `HEAD~${n - 1}`
    r = run(['rev-parse','--verify','--quiet',`${rev}^{commit}`])
    if (r.ok)
    {
        return r.stdout.trim()
    }
    else
    {
        return ''
    }
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
    var fields, head, i, kind, m, orig, out, parts, path, rec, rest, x, xy, y, _174_31_

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
            orig = ((_174_31_=fields[++i]) != null ? _174_31_ : '')
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
    var args, format, long, r, _322_20_

    long = ((_322_20_=opt.long) != null ? _322_20_ : false)
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
    runAttached:runAttached,
    isCommit:isCommit,
    commitAt:commitAt,
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0LmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2dpdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFnQkEsWUFBWSxLQUFLLE9BQU87O0FBT3hCOztXQUFZLE9BQU8sVUFBVyxRQUFRLEtBQU0sVUFBVyxNQUFPLE1BQU87OztBQUVyRTs7OztJQUVJLFFBQ0ksU0FBVSxPQUNWLFVBQVcsVUFDWCxJQUFLO0lBRVQsT0FBTyxPQUFPLE9BQU8sS0FBTTtJQUUzQixJQUFJLGNBQWMsVUFBVSxNQUFPLEtBQU07UUFFdEMsRUFBRTs7Z0JBQ0MsS0FBTSxFQUFHLEdBQUksTUFBTyxPQUFRLEdBQUksT0FBUSxPQUFPLEVBQUUsTUFBTTs7WUFFM0QsZUFBTSxFQUFFLDRCQUFTLEdBQUcsR0FBSSxFQUFFLFdBQVUsRUFBRyxpQkFBUSxFQUFFLDRCQUFTLElBQUksaUJBQVEsRUFBRSw0QkFBUzs7O0FBRXZGOzs7O0lBRUksUUFDSSxTQUFVLE9BQ1YsVUFBVyxVQUNYLElBQUs7V0FFVCxjQUFjLGFBQWEsTUFBTyxLQUFNOzs7QUFTNUM7Ozs7SUFFSSxJQUFJLGNBQWMsVUFBVSxNQUFPLE1BQU8sTUFBTztxQkFFakQsRUFBRSw0QkFBUzs7O0FBS2Y7Ozs7SUFFSSxJQUFJLEtBQUssWUFBYSxXQUFZLGFBQWM7V0FFaEQsRUFBRTs7O0FBS047Ozs7SUFFSSxNQUFTLE1BQUssSUFBTyxpQkFBb0IsSUFBSTtJQUU3QyxJQUFJLEtBQUssWUFBYSxXQUFZLGFBQWM7UUFFN0MsRUFBRTs7ZUFBUSxFQUFFLE9BQU87Ozs7ZUFBWTs7OztBQUV0Qzs7UUFBaUI7O2dCQUFVLElBQUs7Ozs7Ozs7O0FBRWhDOzs7O0lBRUksSUFBSSxLQUFLLFlBQWEseUJBQTBCLEdBQUc7U0FDNUMsRUFBRTs7ZUFBVTs7UUFDaEIsRUFBRSxPQUFPLFdBQVU7O2VBQWM7O1dBQ3BDOzs7QUFFSjs7V0FBa0IsWUFBWSxTQUFROzs7QUFZdEM7Ozs7SUFFSSxPQUNJLE9BQVEsS0FDUixTQUFVLEtBQ1YsTUFBTyxFQUNQ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
//# sourceURL=file:///home/kodi/s/kit/kode/git.kode
