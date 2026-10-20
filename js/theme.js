var _k_ = {isNum: function (o) {return !isNaN(o) && !isNaN(parseFloat(o)) && (isFinite(o) || o === Infinity || o === -Infinity)}}

var BODY_BOTTOM, BODY_TOP, bodyGrey, colourWanted, createTheme

BODY_TOP = 250
BODY_BOTTOM = 239

bodyGrey = function (i, n)
{
    var span

    if (!(_k_.isNum(i)))
    {
        i = 0
    }
    if (!(_k_.isNum(n)))
    {
        n = 1
    }
    if (n <= 1)
    {
        return BODY_TOP
    }
    span = BODY_TOP - BODY_BOTTOM
    return BODY_TOP - Math.round(span * i / (n - 1))
}

createTheme = function (enabled)
{
    var bg, fg, wrap

    wrap = function (open, close)
    {
        return function (s)
        {
            return String(enabled ? `\u001b[${open}m${s}\u001b[${close}m` : s)
        }
    }
    fg = function (code)
    {
        return wrap(`38;5;${code}`,39)
    }
    bg = function (code)
    {
        return wrap(`48;5;${code}`,49)
    }
    return {enabled:enabled,dim:wrap(2,22),bold:wrap(1,22),add:fg(114),del:fg(203),mod:fg(179),untracked:fg(245),headStaged:fg(114),headCommitted:fg(41),headUnstaged:fg(179),headUntracked:fg(245),ahead:fg(114),behind:fg(203),logHash:fg(245),logDate:fg(39),logName:fg(41),logBody:function (s, i, n)
    {
        return fg(bodyGrey(i,n))(s)
    },branch:function (s)
    {
        if (enabled)
        {
            return `\u001b[1m\u001b[38;5;39m${s}\u001b[39m\u001b[0m`
        }
        else
        {
            return String(s)
        }
    },repoPath:function (s)
    {
        return bg(25)(fg(226)(` ${s} `))
    }}
}

colourWanted = function ()
{
    return !process.env.NO_COLOR && process.env.TERM !== 'dumb'
}
export default {
    createTheme:createTheme,
    theme:createTheme(colourWanted())
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VzIjpbIi4uL2tvZGUvdGhlbWUua29kZSJdLCJtYXBwaW5ncyI6Ijs7OztBQWVBLFdBQVc7QUFDWCxjQUFjOztBQUlkOzs7O29CQUVZOztRQUFlLElBQUk7O29CQUNuQjs7UUFBZSxJQUFJOztRQUV4QixLQUFLOztlQUFTOztJQUVqQixPQUFPLFdBQVc7V0FDbEIsV0FBVyxLQUFLLE1BQU0sT0FBTyxLQUFLLElBQUk7OztBQUUxQzs7OztJQUVJOzs7O21CQUE0QixPQUFVLG9CQUFvQixRQUFRLFdBQVcsV0FBYzs7O0lBQzNGOztlQUFlLGFBQWEsT0FBUTs7SUFDcEM7O2VBQWUsYUFBYSxPQUFROztZQUVwQyxRQUFnQixRQUVoQixJQUFnQixLQUFLLEVBQUUsSUFDdkIsS0FBZ0IsS0FBSyxFQUFFLElBRXZCLElBQWdCLEdBQUcsS0FDbkIsSUFBZ0IsR0FBRyxLQUNuQixJQUFnQixHQUFHLEtBQ25CLFVBQWdCLEdBQUcsS0FFbkIsV0FBZ0IsR0FBRyxLQUNuQixjQUFnQixHQUFHLElBQ25CLGFBQWdCLEdBQUcsS0FDbkIsY0FBZ0IsR0FBRyxLQUVuQixNQUFnQixHQUFHLEtBQ25CLE9BQWdCLEdBQUcsS0FFbkIsUUFBZ0IsR0FBRyxLQUNuQixRQUFnQixHQUFHLElBQ25CLFFBQWdCLEdBQUcsSUFDbkI7O2VBQTZCLEdBQUcsU0FBUyxFQUFHLElBQUk7TUFFaEQ7O1lBQWtCOzs4Q0FBcUM7Ozs7bUJBQTRCLE9BQU87O01BQzFGOztlQUFlLEdBQUcsSUFBSSxHQUFHLFNBQVM7Ozs7QUFFdEM7O1lBQXNCLFFBQVEsSUFBSSxZQUFhLFFBQVEsSUFBSSxTQUFROzs7SUFHL0QsWUFBYTtJQUNiLE1BQU8sWUFBWSJ9
//# sourceURL=file:///home/kodi/s/kit/kode/theme.kode
