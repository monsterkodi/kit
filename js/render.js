var _k_ = {empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}, list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var abbreviateHome, CODE_LETTER, codeColour, collapseDates, DEFAULT_WIDTH, defaultTheme, displayWidth, ELLIPSIS, firstLine, fitName, MARK, MIN_MESSAGE_WIDTH, NAME_WIDTH, NARROW_INDENT, NARROW_WIDTH, outOfSync, pad, PREFIX_WIDTH, renderBranch, renderCommit, renderCommitFailure, renderCommitSuccess, renderEntry, renderLog, renderStatus, renderTracking, splitDate, splitLong, truncate, wrap

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
    var ahead, behind, bits, t, _50_24_, _51_25_, _52_18_

    ahead = ((_50_24_=data.ahead) != null ? _50_24_ : 0)
    behind = ((_51_25_=data.behind) != null ? _51_25_ : 0)
    t = ((_52_18_=opt.theme) != null ? _52_18_ : defaultTheme)
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
    var _66_37_, _66_62_

    return (((_66_37_=data.ahead) != null ? _66_37_ : 0)) > 0 || (((_66_62_=data.behind) != null ? _66_62_ : 0)) > 0
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
    var branch, home, label, name, root, t, tracking, _1_16_, _86_20_, _87_18_

    home = ((_86_20_=opt.home) != null ? _86_20_ : process.env.HOME)
    t = ((_87_18_=opt.theme) != null ? _87_18_ : defaultTheme)
    name = data.detached ? `detached@${String(((_1_16_=data.oid) != null ? _1_16_ : '')).slice(0,7)}` : data.branch
    label = (name != null ? name : 'unknown')
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
    var gutter, letter, lower, paint, raw, t, _103_18_, _104_22_

    t = ((_103_18_=opt.theme) != null ? _103_18_ : defaultTheme)
    lower = ((_104_22_=opt.lower) != null ? _104_22_ : false)
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
    var committed, groups, lines, t, width, _135_30_, _136_18_

    committed = ((_135_30_=opt.committed) != null ? _135_30_ : false)
    t = ((_136_18_=opt.theme) != null ? _136_18_ : defaultTheme)
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
    var bold, branch, close, hash, head, line, lines, open, out, subject, t, _, _187_18_

    t = ((_187_18_=opt.theme) != null ? _187_18_ : defaultTheme)
    lines = stdout.replace(/\n+$/,'').split('\n')
    out = []
    var list = _k_.list(lines)
    for (var _b_ = 0; _b_ < list.length; _b_++)
    {
        line = list[_b_]
        head = line.match(/^\[([^\s\]]+)(?:\x20([0-9a-f]{4,}))?\]\x20(.*)$/)
        if (head)
        {
            var _c_ = head; _ = _c_[0]; branch = _c_[1]; hash = _c_[2]; subject = _c_[3]

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
        var blank, current, date, _273_29_

        date = String(((_273_29_=c.date) != null ? _273_29_ : ''))
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
    var dates, long, t, width, _289_22_, _290_21_, _291_18_

    if (!commits || commits.length === 0)
    {
        return ''
    }
    width = ((_289_22_=opt.width) != null ? _289_22_ : DEFAULT_WIDTH)
    long = ((_290_21_=opt.long) != null ? _290_21_ : false)
    t = ((_291_18_=opt.theme) != null ? _291_18_ : defaultTheme)
    dates = long ? commits.map(function (c)
    {
        var _293_58_

        return String(((_293_58_=c.date) != null ? _293_58_ : ''))
    }) : collapseDates(commits)
    return commits.map(function (c, i)
    {
        return renderCommit(c,width,long,t,dates[i])
    }).join('\n')
}
PREFIX_WIDTH = 7 + 1 + 12 + 1 + NAME_WIDTH + 1
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
    for (var _d_ = 0; _d_ < list.length; _d_++)
    {
        paragraph = list[_d_]
        if (paragraph.trim() === '')
        {
            out.push('')
            continue
        }
        line = ''
        var list1 = _k_.list(paragraph.trim().split(/\s+/))
        for (var _e_ = 0; _e_ < list1.length; _e_++)
        {
            word = list1[_e_]
            var list2 = _k_.list(splitLong(word,Math.max(width,1)))
            for (var _f_ = 0; _f_ < list2.length; _f_++)
            {
                chunk = list2[_f_]
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

renderCommit = function (c, width, long, t, date = ((_370_47_=c.date) != null ? _370_47_ : ''))
{
    var body, budget, hash, indent, inner, lines, name, prefix, rest, stamp, text, _372_28_, _378_18_, _378_30_

    hash = t.logHash(((_372_28_=c.hash) != null ? _372_28_ : ''))
    stamp = t.logDate(date)
    name = t.logName(fitName(c.name))
    prefix = `${hash} ${stamp} ${name} `
    body = ((_378_18_=c.body) != null ? _378_18_ : ((_378_30_=c.subject) != null ? _378_30_ : ''))
    if (width < NARROW_WIDTH)
    {
        text = long ? body : firstLine(c)
        inner = Math.max(width - NARROW_INDENT,8)
        indent = ' '.repeat(NARROW_INDENT)
        if (long)
        {
            lines = wrap(text,inner)
        }
        else
        {
            lines = [truncate(text,Math.min(Math.max(inner,MIN_MESSAGE_WIDTH),width - NARROW_INDENT))]
        }
        rest = lines.map(function (l)
        {
            return indent + l
        })
        return [prefix.trimEnd()].concat(rest).join('\n')
    }
    budget = Math.max(width - PREFIX_WIDTH,1)
    text = long ? body : firstLine(c)
    if (long)
    {
        lines = wrap(text,budget)
        indent = ' '.repeat(PREFIX_WIDTH)
        rest = lines.slice(1).map(function (l)
        {
            if (l === '')
            {
                return ''
            }
            else
            {
                return indent + l
            }
        })
        return [prefix + lines[0]].concat(rest).join('\n')
    }
    if (budget < MIN_MESSAGE_WIDTH)
    {
        return prefix + text
    }
    return prefix + truncate(text,budget)
}

firstLine = function (c)
{
    var s, _421_25_

    if (c.subject !== undefined && !c.subject.includes('\n'))
    {
        return c.subject
    }
    s = String(((_421_25_=c.subject) != null ? _421_25_ : ''))
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