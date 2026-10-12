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
    var opts, r, _53_26_, _53_67_, _53_90_

    opts = {encoding:'utf8',maxBuffer:MAXBUFFER,env:gitEnv()}
    opts = Object.assign(opts,opt)
    r = cp.spawnSync('git',args,opts)
    if (r.error)
    {
        return {code:1,ok:false,stdout:'',stderr:String(r.error.message)}
    }
    return {code:((_53_26_=r.status) != null ? _53_26_ : 1),ok:r.status === 0,stdout:((_53_67_=r.stdout) != null ? _53_67_ : ''),stderr:((_53_90_=r.stderr) != null ? _53_90_ : '')}
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