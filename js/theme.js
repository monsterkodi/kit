var colourWanted, createTheme


colourWanted = function ()
{
    return !process.env.NO_COLOR && process.env.TERM !== 'dumb'
}

createTheme = function (enabled)
{
    var bg, chip, fg, on, onChip, wrap

    on = Boolean(enabled)
    wrap = function (open, close)
    {
        return function (s)
        {
            return String(on ? `\u001b[${open}m${s}\u001b[${close}m` : s)
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
    chip = bg(25)
    onChip = fg(226)
    return {enabled:on,add:fg(114),del:fg(203),mod:fg(179),untracked:fg(245),branch:function (s)
    {
        if (on)
        {
            return `\u001b[1m\u001b[38;5;39m${s}\u001b[39m\u001b[0m`
        }
        else
        {
            return String(s)
        }
    },repoPath:function (s)
    {
        return chip(onChip(` ${s} `))
    },dim:wrap(2,22),bold:wrap(1,22),headStaged:fg(114),headCommitted:fg(41),headUnstaged:fg(179),headUntracked:fg(245),ahead:fg(114),behind:fg(203),logHash:fg(245),logDate:fg(39),logName:fg(41)}
}
export default {
    createTheme:createTheme,
    theme:createTheme(colourWanted())
}