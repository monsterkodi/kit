var escape, FILLER, GAP, headerOf, headingLines, headingOf, plain, plainTheme

import theme from "../theme.js"


plain = function (s)
{
    return s.replace(/\u001b\[[0-9;]*m/g,'')
}
plainTheme = theme.createTheme(false)
FILLER = '[\\s\\p{P}\\p{S}]*'
GAP = '[\\s\\p{P}\\p{S}]+'

escape = function (s)
{
    return s.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')
}

headerOf = function (root, branch)
{
    return (new RegExp(`^${FILLER}${escape(root)}${GAP}${escape(branch)}$`,'mu'))
}

headingOf = function (words)
{
    return (new RegExp(`^\\S+ (?:${words})\\s*$`,'m'))
}

headingLines = function (out)
{
    return plain(out).split('\n').filter(function (l)
    {
        return headingOf('committed|staged|unstaged|untracked').test(l)
    })
}
export default {
    plain:plain,
    plainTheme:plainTheme,
    headerOf:headerOf,
    headingOf:headingOf,
    headingLines:headingLines
}