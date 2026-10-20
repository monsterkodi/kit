var commit, messageFor

import git from "./git.js"

import add from "./add.js"

import render from "./render.js"


messageFor = function (words)
{
    var joined

    joined = words.join(' ').trim()
    if (joined === '')
    {
        return 'misc'
    }
    return joined
}

commit = function (words, io = console, opt = {})
{
    var detail, msg, out, r, staged, t

    t = opt.theme
    if (!git.inRepo())
    {
        io.error('kit commit: not a git repository')
        return 128
    }
    staged = add.add([],io,{committed:true,theme:t})
    if (staged !== 0)
    {
        return staged
    }
    r = git.run(['commit','-m',messageFor(words)])
    if (r.ok)
    {
        out = render.renderCommitSuccess(r.stdout,{theme:t})
        if (out)
        {
            io.log(out)
        }
        return 0
    }
    if (git.stagedCount() === 0)
    {
        return r.code
    }
    msg = render.renderCommitFailure(r.stdout)
    if (msg)
    {
        io.log(msg)
    }
    detail = r.stderr.trim()
    if (detail)
    {
        io.error(detail)
    }
    return r.code
}
export default {
    messageFor:messageFor,
    commit:commit
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWl0LmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2NvbW1pdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUF5QkE7Ozs7SUFFSSxTQUFTLE1BQU0sS0FBSyxLQUFLO1FBQ3RCLFdBQVU7O2VBQVU7O1dBQ3ZCOzs7QUFFSjs7OztJQUVJLElBQUksSUFBSTtTQUVELElBQUk7O1FBQ1AsR0FBRyxNQUFNO2VBQ0Y7O0lBRVgsU0FBUyxJQUFJLE9BQVEsSUFBSyxVQUFXLEtBQU0sTUFBTztRQUMvQyxXQUFVOztlQUFjOztJQUUzQixJQUFJLElBQUksS0FBSyxTQUFVLEtBQU0sV0FBVztRQUVyQyxFQUFFOztRQUNELE1BQU0sT0FBTyxvQkFBb0IsRUFBRSxRQUFTLE1BQU87WUFDaEQ7O1lBQVMsR0FBRyxJQUFJOztlQUNaOztRQUtSLElBQUksa0JBQWlCOztlQUFjLEVBQUU7O0lBRXhDLE1BQU0sT0FBTyxvQkFBb0IsRUFBRTtRQUNoQzs7UUFBUyxHQUFHLElBQUk7O0lBRW5CLFNBQVMsRUFBRSxPQUFPO1FBQ2Y7O1FBQVksR0FBRyxNQUFNOztXQUV4QixFQUFFOzs7SUFHRixXQUFZO0lBQ1osT0FBUSJ9
//# sourceURL=file:///home/kodi/s/kit/kode/commit.kode
