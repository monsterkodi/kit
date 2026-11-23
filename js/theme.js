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
    },noneText:fg(242),noneName:fg(248),branch:function (s)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VzIjpbIi4uL2tvZGUvdGhlbWUua29kZSJdLCJtYXBwaW5ncyI6Ijs7OztBQWVBLFdBQVc7QUFDWCxjQUFjOztBQUlkLHFCQUFZLEdBQUc7Ozs7VUFFRSxVQUFMOztRQUFlLElBQUk7O1VBQ2QsVUFBTDs7UUFBZSxJQUFJOztRQUV4QixLQUFLOztlQUFTOztJQUVqQixPQUFPLFdBQVc7V0FDbEIsV0FBVyxLQUFLLE1BQU0sT0FBTyxLQUFLLElBQUk7OztBQUUxQyx3QkFBYzs7OztJQUVWLGlCQUFPLE1BQUs7O3lCQUFVOzttQkFBTSxPQUFVLG9CQUFvQixRQUFRLFdBQVcsV0FBYzs7O0lBQzNGLGVBQU87O2VBQVEsYUFBYSxPQUFROztJQUNwQyxlQUFPOztlQUFRLGFBQWEsT0FBUTs7WUFFcEMsUUFBZ0IsUUFFaEIsSUFBZ0IsS0FBSyxFQUFFLElBQ3ZCLEtBQWdCLEtBQUssRUFBRSxJQUV2QixJQUFnQixHQUFHLEtBQ25CLElBQWdCLEdBQUcsS0FDbkIsSUFBZ0IsR0FBRyxLQUNuQixVQUFnQixHQUFHLEtBRW5CLFdBQWdCLEdBQUcsS0FDbkIsY0FBZ0IsR0FBRyxJQUNuQixhQUFnQixHQUFHLEtBQ25CLGNBQWdCLEdBQUcsS0FFbkIsTUFBZ0IsR0FBRyxLQUNuQixPQUFnQixHQUFHLEtBRW5CLFFBQWdCLEdBQUcsS0FDbkIsUUFBZ0IsR0FBRyxJQUNuQixRQUFnQixHQUFHLElBQ25CLGtCQUFpQixHQUFHLEdBQUc7O2VBQU0sR0FBRyxTQUFTLEVBQUcsSUFBSTtNQUVoRCxTQUFnQixHQUFHLEtBQ25CLFNBQWdCLEdBQUcsS0FFbkIsaUJBQVU7O1lBQVE7OzhDQUFxQzs7OzttQkFBNEIsT0FBTzs7TUFDMUYsbUJBQVU7O2VBQUssR0FBRyxJQUFJLEdBQUcsU0FBUzs7OztBQUV0Qzs7WUFBc0IsUUFBUSxJQUFJLFlBQWEsUUFBUSxJQUFJLFNBQVE7OztJQUcvRCxZQUFhO0lBQ2IsTUFBTyxZQUFZIn0=
//# sourceURL=../kode/theme.kode
