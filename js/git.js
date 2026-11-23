var _k_ = {empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var at, capture, collectFiles, collectLog, collectStatus, commitAt, fileList, gitEnv, hasCommits, inRepo, isCommit, LOG_DATE, LOG_FORMAT_FILES, LOG_FORMAT_LONG, LOG_FORMAT_SHORT, LOG_MARK_FILES, LOG_STRIDE, MAXBUFFER, parseFiles, parseLog, parseStatusV2, relativeTo, relativise, repoProblem, run, runAttached, showPrefix, showToplevel, stagedCount

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
    for (i = 0; i < fields.length; i++)
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
LOG_MARK_FILES = '<<files>>'
LOG_STRIDE = 5

parseLog = function (raw)
{
    var date, fields, hash, i, message, name, out, text

    fields = raw.split('\0')
    out = []
    i = 1
    while (i + 4 <= fields.length)
    {
        ;[hash,date,name,message] = fields.slice(i,i + 4)
        if (!_k_.empty(hash))
        {
            text = String((message != null ? message : '')).replace(/\s+$/,'')
            out.push({hash:hash.trim(),date:date.trim(),name:name.trim(),subject:text,body:text})
        }
        i += LOG_STRIDE
    }
    return out
}

fileList = function (block)
{
    var line, m, out, parts

    out = []
    var list = _k_.list(String((block != null ? block : '')).split('\n'))
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        line = list[_a_]
        if (line === '')
        {
            continue
        }
        m = line.match(/^([A-Z])\d*\t(.+)$/)
        if (!m)
        {
            continue
        }
        parts = m[2].split('\t')
        out.push({code:m[1],path:parts[parts.length - 1],orig:parts.length > 1 ? parts[0] : null})
    }
    return out
}
LOG_FORMAT_FILES = '%x00%h%x00' + LOG_MARK_FILES

collectFiles = function (count = null, paths = [])
{
    var args, r

    args = ['log','--name-status',`--format=${LOG_FORMAT_FILES}`,'--reverse']
    if (count !== null)
    {
        args.push('-n',String(count))
    }
    if (paths.length > 0)
    {
        args = args.concat(['--']).concat(paths)
    }
    r = run(args)
    if (!r.ok)
    {
        return {error:r,data:null}
    }
    return {error:null,data:parseFiles(r.stdout)}
}

parseFiles = function (raw)
{
    var block, fields, hash, i, out, _374_30_

    out = {}
    fields = raw.split('\0')
    i = 1
    while (i + 1 < fields.length)
    {
        hash = fields[i].trim()
        block = ((_374_30_=fields[i + 1]) != null ? _374_30_ : '')
        if (!_k_.empty(hash) && block.startsWith(LOG_MARK_FILES))
        {
            out[hash] = fileList(block.slice(LOG_MARK_FILES.length))
        }
        i += 2
    }
    return out
}

hasCommits = function ()
{
    return run(['rev-parse','--verify','HEAD']).ok
}

collectLog = function (count = null, opt = {})
{
    var args, c, data, f, files, format, long, paths, r, _395_20_, _396_22_, _397_22_, _418_37_

    long = ((_395_20_=opt.long) != null ? _395_20_ : false)
    files = ((_396_22_=opt.files) != null ? _396_22_ : false)
    paths = ((_397_22_=opt.paths) != null ? _397_22_ : [])
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
    data = parseLog(r.stdout)
    if (files)
    {
        f = collectFiles(count,paths)
        if (f.error)
        {
            return {error:f.error,data:null}
        }
        var list = _k_.list(data)
        for (var _b_ = 0; _b_ < list.length; _b_++)
        {
            c = list[_b_]
            c.files = ((_418_37_=f.data[c.hash]) != null ? _418_37_ : [])
        }
    }
    return {error:null,data:data}
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
    collectFiles:collectFiles,
    parseLog:parseLog,
    fileList:fileList,
    parseFiles:parseFiles,
    LOG_DATE:LOG_DATE
}

//# sourceMappingURL=data:application/json;base64,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
//# sourceURL=../kode/git.kode
