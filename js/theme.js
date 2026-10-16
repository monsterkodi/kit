var colourWanted, createTheme


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
    return {enabled:enabled,dim:wrap(2,22),bold:wrap(1,22),add:fg(114),del:fg(203),mod:fg(179),untracked:fg(245),headStaged:fg(114),headCommitted:fg(41),headUnstaged:fg(179),headUntracked:fg(245),ahead:fg(114),behind:fg(203),logHash:fg(245),logDate:fg(39),logName:fg(41),branch:function (s)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VzIjpbIi4uL2tvZGUvdGhlbWUua29kZSJdLCJtYXBwaW5ncyI6Ijs7O0FBUUE7Ozs7SUFFSTs7OzttQkFBNEIsT0FBVSxvQkFBb0IsUUFBUSxXQUFXLFdBQWM7OztJQUMzRjs7ZUFBZSxhQUFhLE9BQVE7O0lBQ3BDOztlQUFlLGFBQWEsT0FBUTs7WUFFcEMsUUFBZ0IsUUFFaEIsSUFBZ0IsS0FBSyxFQUFFLElBQ3ZCLEtBQWdCLEtBQUssRUFBRSxJQUV2QixJQUFnQixHQUFHLEtBQ25CLElBQWdCLEdBQUcsS0FDbkIsSUFBZ0IsR0FBRyxLQUNuQixVQUFnQixHQUFHLEtBRW5CLFdBQWdCLEdBQUcsS0FDbkIsY0FBZ0IsR0FBRyxJQUNuQixhQUFnQixHQUFHLEtBQ25CLGNBQWdCLEdBQUcsS0FFbkIsTUFBZ0IsR0FBRyxLQUNuQixPQUFnQixHQUFHLEtBRW5CLFFBQWdCLEdBQUcsS0FDbkIsUUFBZ0IsR0FBRyxJQUNuQixRQUFnQixHQUFHLElBRW5COztZQUFrQjs7OENBQXFDOzs7O21CQUE0QixPQUFPOztNQUMxRjs7ZUFBZSxHQUFHLElBQUksR0FBRyxTQUFTOzs7O0FBRXRDOztZQUFzQixRQUFRLElBQUksWUFBYSxRQUFRLElBQUksU0FBUTs7O0lBRy9ELFlBQWE7SUFDYixNQUFPLFlBQVkifQ==
//# sourceURL=file://kode/theme.kode
