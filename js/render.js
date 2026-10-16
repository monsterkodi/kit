var _k_ = {in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, empty: function (l) {return l==='' || l===null || l===undefined || l!==l || typeof(l) === 'object' && Object.keys(l).length === 0}, list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

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
        var blank, current, date, _242_29_

        date = String(((_242_29_=c.date) != null ? _242_29_ : ''))
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
    var dates, long, t, width, _258_22_, _259_21_, _260_18_

    if (!commits || commits.length === 0)
    {
        return ''
    }
    width = ((_258_22_=opt.width) != null ? _258_22_ : DEFAULT_WIDTH)
    long = ((_259_21_=opt.long) != null ? _259_21_ : false)
    t = ((_260_18_=opt.theme) != null ? _260_18_ : defaultTheme)
    dates = long ? commits.map(function (c)
    {
        var _262_58_

        return String(((_262_58_=c.date) != null ? _262_58_ : ''))
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

renderCommit = function (c, width, long, t, date = ((_339_47_=c.date) != null ? _339_47_ : ''))
{
    var body, budget, hash, indent, inner, lines, name, prefix, rest, stamp, text, _341_28_, _347_18_, _347_30_

    hash = t.logHash(((_341_28_=c.hash) != null ? _341_28_ : ''))
    stamp = t.logDate(date)
    name = t.logName(fitName(c.name))
    prefix = `${hash} ${stamp} ${name} `
    body = ((_347_18_=c.body) != null ? _347_18_ : ((_347_30_=c.subject) != null ? _347_30_ : ''))
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
    var s, _390_25_

    if (c.subject !== undefined && !c.subject.includes('\n'))
    {
        return c.subject
    }
    s = String(((_390_25_=c.subject) != null ? _390_25_ : ''))
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlcyI6WyIuLi9rb2RlL3JlbmRlci5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFZQSxlQUFlLE1BQU07QUFFckIsZUFDSSxFQUFHLElBQ0gsRUFBRyxJQUNILEVBQUcsSUFDSCxFQUFHLElBQ0gsRUFBRyxJQUNILEVBQUcsSUFDSCxFQUFHOztBQUVQOztZQUVXOzthQUNIO21CQUFRLEVBQUU7O2FBQ1Y7bUJBQVEsRUFBRTs7YUFDVjttQkFBUSxFQUFFOzthQUNWO21CQUFRLEVBQUU7O2FBQ1Y7bUJBQVEsRUFBRTs7YUFDVjttQkFBUSxFQUFFOzs7bUJBQ0gsRUFBRTs7Ozs7QUFLakI7Ozs7SUFFSSxrQkFBUyxLQUFLLDJCQUFRO0lBQ3RCLG1CQUFTLEtBQUssNEJBQVM7SUFDdkIsY0FBSSxJQUFJLDJCQUFRO0lBRWhCO1FBQ0csUUFBUTs7UUFBTyxLQUFLLEtBQUssRUFBRSxVQUFVOztRQUNyQyxTQUFTOztRQUFPLEtBQUssS0FBSyxFQUFFLFdBQVc7O1dBRTFDLEtBQUssS0FBSzs7O0FBSWQ7Ozs7c0JBQTBCLEtBQUssMkJBQVEsTUFBSyxnQkFBTSxLQUFLLDRCQUFTLE1BQUs7OztBQUlyRTs7OztJQUVJLElBQUksUUFBTyxlQUFBLE9BQU87U0FDWDs7ZUFBWTs7SUFFbkIsT0FBTyxPQUFPLE1BQU0sUUFBUSxPQUFRO1FBQ2pDLE1BQUs7O2VBQVk7O1FBQ2pCLEVBQUUsV0FBVyxPQUFPOztlQUFZLE1BQU0sRUFBRSxNQUFNLEtBQUs7O1dBQ3REOzs7QUFLSjs7OztJQUVJLGlCQUFPLElBQUksMEJBQU8sUUFBUSxJQUFJO0lBQzlCLGNBQUksSUFBSSwyQkFBUTtJQUVoQixPQUFVLEtBQUssdUJBQTBCLGlCQUFPLEtBQUsseUJBQU0sS0FBSSxNQUFNLEVBQUcsT0FBVSxLQUFLO0lBQ3ZGLFNBQVEsZUFBQSxPQUFPO2VBQ0QsT0FBVSxPQUFPOztRQUEvQixRQUFROztJQUNSLFdBQVcsZUFBZSxNQUFPLE1BQU87SUFFeEMsU0FBWSxj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
//# sourceURL=file://kode/render.kode
