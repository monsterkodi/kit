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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC9zdHlsZS5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7OztBQTRCQTs7V0FBZSxFQUFFLFFBQVEsb0JBQXFCOztBQUk5QyxhQUFhLE1BQU0sWUFBWTtBQUUvQixTQUFTO0FBQ1QsTUFBUzs7QUFFVDs7V0FBZ0IsRUFBRSxRQUFRLHVCQUF3Qjs7O0FBRWxEOztnQkFBa0MsV0FBVyxTQUFTLE9BQU8sUUFBUSxNQUFNLE9BQU8sV0FBWTs7O0FBRTlGOztnQkFBNEIsbUJBQW1CLGNBQWU7OztBQUU5RDs7V0FFSSxNQUFNLEtBQUssTUFBTSxNQUFNOztlQUFjLFVBQVUsdUNBQXVDLEtBQUs7Ozs7SUFHM0YsTUFBTztJQUNQLFdBQVk7SUFDWixTQUFVO0lBQ1YsVUFBVztJQUNYLGFBQWMifQ==
//# sourceURL=file://kode/test/style.kode
