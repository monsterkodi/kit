var _k_ = {in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}, list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var abbreviateHome, CODE_LETTER, codeColour, collapseDates, DEFAULT_WIDTH, defaultTheme, displayWidth, ELLIPSIS, firstLine, fitName, HASH_WIDTH, MARK, MIN_MESSAGE_WIDTH, NAME_WIDTH, NARROW_INDENT, NARROW_WIDTH, outOfSync, pad, paintBody, PREFIX_WIDTH, renderBranch, renderCommit, renderCommitFailure, renderCommitSuccess, renderEntry, renderLog, renderNoChanges, renderStatus, renderTracking, splitDate, splitLong, truncate, wrap

import theme from "./theme.js"

defaultTheme = theme.theme
CODE_LETTER = {M:'M',A:'A',D:'D',R:'R',C:'C',T:'T',U:'U'}

codeColour = function (code, t)
{
    switch (code)
    {
        case 'A':
            return t.add

        case 'D':
            return t.del

        case 'R':
            return t.mod

        case 'C':
            return t.mod

        case 'U':
            return t.del

        case '?':
            return t.untracked

        default:
            return t.mod
    }

}

renderTracking = function (data = {}, opt = {})
{
    var ahead, behind, bits, t, _40_24_, _41_25_, _42_18_

    ahead = ((_40_24_=data.ahead) != null ? _40_24_ : 0)
    behind = ((_41_25_=data.behind) != null ? _41_25_ : 0)
    t = ((_42_18_=opt.theme) != null ? _42_18_ : defaultTheme)
    bits = []
    if (ahead > 0)
    {
        bits.push(t.ahead(`↑${ahead}`))
    }
    if (behind > 0)
    {
        bits.push(t.behind(`↓${behind}`))
    }
    return bits.join(' ')
}

outOfSync = function (data = {})
{
    var _52_37_, _52_62_

    return (((_52_37_=data.ahead) != null ? _52_37_ : 0)) > 0 || (((_52_62_=data.behind) != null ? _52_62_ : 0)) > 0
}

abbreviateHome = function (path, home)
{
    var base, p

    p = String((path != null ? path : ''))
    if (!home)
    {
        return p
    }
    base = String(home).replace(/\/+$/,'')
    if (p === base)
    {
        return '~'
    }
    if (p.startsWith(base + '/'))
    {
        return '~' + p.slice(base.length)
    }
    return p
}

renderBranch = function (data, opt = {})
{
    var branch, home, label, name, root, t, tracking, _71_20_, _72_18_, _74_61_

    home = ((_71_20_=opt.home) != null ? _71_20_ : process.env.HOME)
    t = ((_72_18_=opt.theme) != null ? _72_18_ : defaultTheme)
    name = data.detached ? `detached@${String(((_74_61_=data.oid) != null ? _74_61_ : '')).slice(0,7)}` : data.branch
    label = (name != null ? name : 'unknown')
    if (_k_.in(label,['main','master']))
    {
        label = ''
    }
    tracking = renderTracking(data,{theme:t})
    branch = tracking ? `${t.branch(label)} ${tracking}` : t.branch(label)
    if (!data.root)
    {
        return branch
    }
    root = t.repoPath(abbreviateHome(data.root,home))
    return `${root} ${branch}`
}

renderEntry = function (item, opt = {})
{
    var gutter, letter, lower, paint, raw, t, _89_18_, _90_22_

    t = ((_89_18_=opt.theme) != null ? _89_18_ : defaultTheme)
    lower = ((_90_22_=opt.lower) != null ? _90_22_ : false)
    raw = CODE_LETTER[item.code]
    if (_k_.empty(raw))
    {
        raw = item.code
    }
    if (_k_.empty(raw))
    {
        raw = '?'
    }
    letter = lower ? raw.toLowerCase() : raw
    paint = codeColour(item.code,t)
    gutter = paint(letter)
    if (item.orig)
    {
        return `${gutter} ${item.path} ${t.dim('← ' + item.orig)}`
    }
    return `${gutter} ${item.path}`
}

pad = function (s, n)
{
    if (s.length >= n)
    {
        return s
    }
    else
    {
        return s + ' '.repeat(n - s.length)
    }
}
MARK = '●'

renderStatus = function (data, opt = {})
{
    var committed, groups, lines, t, width, _121_30_, _122_18_

    committed = ((_121_30_=opt.committed) != null ? _121_30_ : false)
    t = ((_122_18_=opt.theme) != null ? _122_18_ : defaultTheme)
    groups = [{key:'staged',head:committed ? 'committed' : 'staged',colour:committed ? t.headCommitted : t.headStaged,items:data.staged,lower:committed},{key:'unstaged',head:'unstaged',colour:t.headUnstaged,items:data.unstaged},{key:'untracked',head:'untracked',colour:t.headUntracked,items:data.untracked}]
    groups = groups.filter(function (g)
    {
        return g.items && g.items.length > 0
    })
    if (groups.length === 0)
    {
        if (outOfSync(data))
        {
            return renderBranch(data,opt)
        }
        else
        {
            return ''
        }
    }
    lines = [renderBranch(data,opt)]
    width = Math.max.apply(null,groups.map(function (g)
    {
        return g.head.length
    }))
    groups.forEach(function (g, idx)
    {
        var entry, item, label

        label = idx < groups.length - 1 ? pad(g.head,width) : g.head
        lines.push(g.colour(`${MARK} ${label}`))
        var list = _k_.list(g.items)
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            item = list[_a_]
            entry = renderEntry(item,{lower:g.lower,theme:t})
            lines.push(`  ${entry}`)
        }
    })
    return lines.join('\n')
}

renderCommitSuccess = function (stdout, opt = {})
{
    var bold, branch, close, hash, head, line, lines, open, out, subject, t, _, _173_18_

    t = ((_173_18_=opt.theme) != null ? _173_18_ : defaultTheme)
    lines = stdout.replace(/\n+$/,'').split('\n')
    out = []
    var list = _k_.list(lines)
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        line = list[_b_]
        head = line.match(/^\[([^\s\]]+)(?:\x20([0-9a-f]{4,}))?\]\x20(.*)$/)
        if (head)
        {
            ;[_,branch,hash,subject] = head
            open = t.dim('[' + branch)
            bold = hash ? ' ' + t.bold(hash) : ''
            close = t.dim(']')
            out.push(`${open}${bold}${close} ${subject}`)
            continue
        }
        if ((/^\s*Author:\x20/).test(line))
        {
            continue
        }
        if ((/^\s*(create|delete|rename|chmod)\x20mode\x20/).test(line))
        {
            continue
        }
        out.push(t.dim(line))
    }
    return out.join('\n')
}

renderCommitFailure = function (stdout, opt = {})
{
    var clean, m

    clean = stdout.replace(/\n+$/,'')
    if ((/nothing\x20to\x20commit,\x20working\x20tree\x20clean/).test(clean))
    {
        return ''
    }
    m = clean.match(/^(nothing\x20added\x20to\x20commit[^\n]*)/m)
    if (m)
    {
        return m[1].replace(/\s*\(use\x20"git\x20add[^)]*\)\s*$/,'').trim()
    }
    return clean.trim()
}

renderNoChanges = function (paths, opt = {})
{
    var i, p, push, segs, t, _217_18_

    t = ((_217_18_=opt.theme) != null ? _217_18_ : defaultTheme)
    segs = []
    push = function (s, isName)
    {
        var prev

        prev = segs[segs.length - 1]
        if (prev && !isName && !prev[1])
        {
            return prev[0] += s
        }
        else
        {
            return segs.push([s,isName])
        }
    }
    push('no ',false)
    var list = _k_.list(paths)
    for (i = 0; i < list.length; i++)
    {
        p = list[i]
        if (i > 0)
        {
            push(' ',false)
        }
        if (p.startsWith('*.'))
        {
            push('*.',false)
            push(p.slice(2),true)
        }
        else
        {
            push(p,true)
        }
    }
    push(' changes',false)
    return segs.map(function ([s,isName])
    {
        if (isName)
        {
            return t.noneName(s)
        }
        else
        {
            return t.noneText(s)
        }
    }).join('')
}
NAME_WIDTH = 8

fitName = function (name, width = NAME_WIDTH)
{
    var s

    s = String((name != null ? name : ''))
    if (s.length >= width)
    {
        return s.slice(0,width)
    }
    return s.padEnd(width)
}

splitDate = function (date)
{
    var calendar, day, month, monthEnd, timeStart

    timeStart = date.lastIndexOf(' ') + 1
    calendar = date.slice(0,timeStart)
    monthEnd = calendar.indexOf(' ')
    month = monthEnd < 0 ? calendar : calendar.slice(0,monthEnd)
    day = monthEnd < 0 ? '' : calendar.slice(monthEnd + 1).trim()
    return {month:month,day:day,timeStart:timeStart}
}

collapseDates = function (commits)
{
    var previous

    previous = null
    return commits.map(function (c)
    {
        var blank, current, date, _270_29_

        date = String(((_270_29_=c.date) != null ? _270_29_ : ''))
        current = splitDate(date)
        blank = 0
        if (previous && current.month === previous.month)
        {
            blank = current.month.length
            if (current.day === previous.day)
            {
                blank = current.timeStart
            }
        }
        previous = current
        return ' '.repeat(blank) + date.slice(blank)
    })
}

renderLog = function (commits, opt = {})
{
    var dates, hashWidth, long, out, t, width, _286_22_, _287_21_, _288_18_

    if (!commits || commits.length === 0)
    {
        return ''
    }
    width = ((_286_22_=opt.width) != null ? _286_22_ : DEFAULT_WIDTH)
    long = ((_287_21_=opt.long) != null ? _287_21_ : false)
    t = ((_288_18_=opt.theme) != null ? _288_18_ : defaultTheme)
    dates = long ? commits.map(function (c)
    {
        var _290_58_

        return String(((_290_58_=c.date) != null ? _290_58_ : ''))
    }) : collapseDates(commits)
    hashWidth = Math.max.apply(null,commits.map(function (c)
    {
        var _296_76_

        return displayWidth(((_296_76_=c.hash) != null ? _296_76_ : ''))
    }))
    hashWidth = Math.max(hashWidth,HASH_WIDTH)
    out = []
    commits.forEach(function (c, i)
    {
        var block, l

        block = renderCommit(c,width,long,t,dates[i],hashWidth)
        var list = _k_.list(block.lines)
        for (var _d_ = 0; _d_ < list.length; _d_++)
        {
            l = list[_d_]
            out.push(l)
        }
        if (block.extra > 0 && i < commits.length - 1)
        {
            return out.push('')
        }
    })
    return out.join('\n')
}
HASH_WIDTH = 7
PREFIX_WIDTH = HASH_WIDTH + 1 + 12 + 1 + NAME_WIDTH + 1
NARROW_WIDTH = 60
MIN_MESSAGE_WIDTH = 40
DEFAULT_WIDTH = 80
ELLIPSIS = '…'
NARROW_INDENT = 2

displayWidth = function (s)
{
    return Array.from(String(s)).length
}

truncate = function (s, width)
{
    var chars

    chars = Array.from(String(s))
    if (chars.length <= width)
    {
        return String(s)
    }
    if (width <= 1)
    {
        return ELLIPSIS.slice(0,Math.max(width,0))
    }
    return chars.slice(0,width - 1).join('') + ELLIPSIS
}

wrap = function (text, width)
{
    var chunk, line, out, paragraph, word

    out = []
    var list = _k_.list(String(text).split('\n'))
    for (var _e_ = 0; _e_ < list.length; _e_++)
    {
        paragraph = list[_e_]
        if (paragraph.trim() === '')
        {
            out.push('')
            continue
        }
        line = ''
        var list1 = _k_.list(paragraph.trim().split(/\s+/))
        for (var _f_ = 0; _f_ < list1.length; _f_++)
        {
            word = list1[_f_]
            var list2 = _k_.list(splitLong(word,Math.max(width,1)))
            for (var _10_ = 0; _10_ < list2.length; _10_++)
            {
                chunk = list2[_10_]
                if (line === '')
                {
                    line = chunk
                }
                else if (displayWidth(line) + 1 + displayWidth(chunk) <= width)
                {
                    line += ' ' + chunk
                }
                else
                {
                    out.push(line)
                    line = chunk
                }
            }
        }
        if (line !== '')
        {
            out.push(line)
        }
    }
    return out
}

splitLong = function (word, width)
{
    var chars, chunks, i

    chars = Array.from(word)
    if (chars.length <= width)
    {
        return [word]
    }
    chunks = []
    i = 0
    while (i < chars.length)
    {
        chunks.push(chars.slice(i,i + width).join(''))
        i += width
    }
    return chunks
}

paintBody = function (lines, indent, t)
{
    var count, l, out, step, total

    total = 0
    var list = _k_.list(lines)
    for (var _11_ = 0; _11_ < list.length; _11_++)
    {
        l = list[_11_]
        if (l !== '')
        {
            total += 1
        }
    }
    out = []
    step = 0
    count = 0
    var list1 = _k_.list(lines)
    for (var _12_ = 0; _12_ < list1.length; _12_++)
    {
        l = list1[_12_]
        if (l === '')
        {
            out.push('')
            continue
        }
        out.push(indent + t.logBody(l,step,total))
        step += 1
        count += 1
    }
    return {lines:out,body:count}
}

renderCommit = function (c, width, long, t, date = ((_425_47_=c.date) != null ? _425_47_ : ''), hashWidth = HASH_WIDTH)
{
    var body, budget, extra, hash, indent, inner, item, lines, name, painted, prefix, prefixWidth, stamp, text, wrapped, _429_35_, _435_18_, _435_30_

    prefixWidth = PREFIX_WIDTH + hashWidth - HASH_WIDTH
    hash = t.logHash(String(((_429_35_=c.hash) != null ? _429_35_ : '')).padEnd(hashWidth))
    stamp = t.logDate(date)
    name = t.logName(fitName(c.name))
    prefix = `${hash} ${stamp} ${name} `
    body = ((_435_18_=c.body) != null ? _435_18_ : ((_435_30_=c.subject) != null ? _435_30_ : ''))
    lines = []
    extra = 0
    if (width < NARROW_WIDTH)
    {
        text = long ? body : firstLine(c)
        inner = Math.max(width - NARROW_INDENT,8)
        indent = ' '.repeat(NARROW_INDENT)
        if (long)
        {
            wrapped = wrap(text,inner)
            painted = paintBody(wrapped.slice(1),indent,t)
            lines = [prefix.trimEnd(),indent + wrapped[0]].concat(painted.lines)
            extra += painted.body
        }
        else
        {
            lines = [prefix.trimEnd(),indent + truncate(text,Math.min(Math.max(inner,MIN_MESSAGE_WIDTH),width - NARROW_INDENT))]
        }
    }
    else
    {
        budget = Math.max(width - prefixWidth,1)
        text = long ? body : firstLine(c)
        indent = ' '.repeat(prefixWidth)
        if (long)
        {
            wrapped = wrap(text,budget)
            painted = paintBody(wrapped.slice(1),indent,t)
            lines = [prefix + wrapped[0]].concat(painted.lines)
            extra += painted.body
        }
        else
        {
            if (budget < MIN_MESSAGE_WIDTH)
            {
                lines = [prefix + text]
            }
            else
            {
                lines = [prefix + truncate(text,budget)]
            }
        }
    }
    if (c.files && c.files.length > 0)
    {
        lines.push('')
        var list = _k_.list(c.files)
        for (var _13_ = 0; _13_ < list.length; _13_++)
        {
            item = list[_13_]
            lines.push(indent + renderEntry(item,{theme:t}))
            extra += 1
        }
    }
    return {lines:lines,extra:extra}
}

firstLine = function (c)
{
    var s, _502_25_

    if (c.subject !== undefined && !c.subject.includes('\n'))
    {
        return c.subject
    }
    s = String(((_502_25_=c.subject) != null ? _502_25_ : ''))
    return s.split('\n')[0]
}
export default {
    renderTracking:renderTracking,
    outOfSync:outOfSync,
    abbreviateHome:abbreviateHome,
    renderBranch:renderBranch,
    renderEntry:renderEntry,
    renderStatus:renderStatus,
    renderCommitSuccess:renderCommitSuccess,
    renderCommitFailure:renderCommitFailure,
    renderNoChanges:renderNoChanges,
    fitName:fitName,
    truncate:truncate,
    wrap:wrap,
    collapseDates:collapseDates,
    renderLog:renderLog,
    displayWidth:displayWidth,
    NAME_WIDTH:NAME_WIDTH,
    PREFIX_WIDTH:PREFIX_WIDTH,
    NARROW_WIDTH:NARROW_WIDTH,
    MIN_MESSAGE_WIDTH:MIN_MESSAGE_WIDTH,
    DEFAULT_WIDTH:DEFAULT_WIDTH
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL3JlbmRlci5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7O09BVU0sWUFBQTs7QUFFTixlQUFlLE1BQU07QUFFckIsZUFDSSxFQUFHLElBQ0gsRUFBRyxJQUNILEVBQUcsSUFDSCxFQUFHLElBQ0gsRUFBRyxJQUNILEVBQUcsSUFDSCxFQUFHOztBQUVQLHVCQUFjLE1BQU07O1lBRVQ7O2FBQ0g7bUJBQVEsRUFBRTs7YUFDVjttQkFBUSxFQUFFOzthQUNWO21CQUFRLEVBQUU7O2FBQ1Y7bUJBQVEsRUFBRTs7YUFDVjttQkFBUSxFQUFFOzthQUNWO21CQUFRLEVBQUU7OzttQkFDSCxFQUFFOzs7OztBQUtqQiwyQkFBa0IsV0FBUzs7OztJQUV2QixrQkFBUyxLQUFLLDJCQUFRO0lBQ3RCLG1CQUFTLEtBQUssNEJBQVM7SUFDdkIsY0FBSSxJQUFJLDJCQUFRO0lBRWhCO1FBQ0csUUFBUTs7UUFBTyxLQUFLLEtBQUssRUFBRSxVQUFVOztRQUNyQyxTQUFTOztRQUFPLEtBQUssS0FBSyxFQUFFLFdBQVc7O1dBRTFDLEtBQUssS0FBSzs7O0FBSWQsc0JBQWE7Ozs7c0JBQWEsS0FBSywyQkFBUSxNQUFLLGdCQUFNLEtBQUssNEJBQVMsTUFBSzs7O0FBSXJFLDJCQUFrQixNQUFNOzs7O0lBRXBCLElBQUksUUFBTyxlQUFBLE9BQU87U0FDWDs7ZUFBWTs7SUFFbkIsT0FBTyxPQUFPLE1BQU0sUUFBUSxPQUFRO1FBQ2pDLE1BQUs7O2VBQVk7O1FBQ2pCLEVBQUUsV0FBVyxPQUFPOztlQUFZLE1BQU0sRUFBRSxNQUFNLEtBQUs7O1dBQ3REOzs7QUFLSix5QkFBZ0IsTUFBTTs7OztJQUVsQixpQkFBTyxJQUFJLDBCQUFPLFFBQVEsSUFBSTtJQUM5QixjQUFJLElBQUksMkJBQVE7SUFFaEIsT0FBVSxLQUFLLHVCQUEwQixpQkFBTyxLQUFLLHlCQUFNLEtBQUksTUFBTSxFQUFHLE9BQVUsS0FBSztJQUN2RixTQUFRLGVBQUEsT0FBTztl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
//# sourceURL=../kode/render.kode
