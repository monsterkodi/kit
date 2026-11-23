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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC9zdHlsZS5rb2RlIl0sIm1hcHBpbmdzIjoiOztPQXdCTyxZQUFBOzs7QUFJUCxrQkFBUzs7V0FBTSxFQUFFLFFBQVEsb0JBQXFCOztBQUk5QyxhQUFhLE1BQU0sWUFBWTtBQUUvQixTQUFTO0FBQ1QsTUFBUzs7QUFFVCxtQkFBVTs7V0FBTSxFQUFFLFFBQVEsdUJBQXdCOzs7QUFFbEQscUJBQVksTUFBTTs7Z0JBQWdCLFdBQVcsU0FBUyxPQUFPLFFBQVEsTUFBTSxPQUFPLFdBQVk7OztBQUU5RixzQkFBYTs7Z0JBQWUsbUJBQW1CLGNBQWU7OztBQUU5RCx5QkFBZ0I7O1dBRVosTUFBTSxLQUFLLE1BQU0sTUFBTSxpQkFBUTs7ZUFBTSxVQUFVLHVDQUF1QyxLQUFLOzs7O0lBRzNGLE1BQU87SUFDUCxXQUFZO0lBQ1osU0FBVTtJQUNWLFVBQVc7SUFDWCxhQUFjIn0=
//# sourceURL=../../kode/test/style.kode
