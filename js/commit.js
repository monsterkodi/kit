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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWl0LmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2NvbW1pdC5rb2RlIl0sIm1hcHBpbmdzIjoiOztPQWdCTSxVQUFBOztPQUNBLFVBQUE7O09BQ0EsYUFBQTs7O0FBT04sdUJBQWM7Ozs7SUFFVixTQUFTLE1BQU0sS0FBSyxLQUFLO1FBQ3RCLFdBQVU7O2VBQVU7O1dBQ3ZCOzs7QUFFSixtQkFBVSxPQUFPLEtBQUcsU0FBUzs7OztJQUV6QixJQUFJLElBQUk7U0FFRCxJQUFJOztRQUNQLEdBQUcsTUFBTTtlQUNGOztJQUVYLFNBQVMsSUFBSSxPQUFRLElBQUssVUFBVyxLQUFNLE1BQU87UUFDL0MsV0FBVTs7ZUFBYzs7SUFFM0IsSUFBSSxJQUFJLEtBQUssU0FBVSxLQUFNLFdBQVc7UUFFckMsRUFBRTs7UUFDRCxNQUFNLE9BQU8sb0JBQW9CLEVBQUUsUUFBUyxNQUFPO1lBQ2hEOztZQUFTLEdBQUcsSUFBSTs7ZUFDWjs7UUFLUixJQUFJLGtCQUFpQjs7ZUFBYyxFQUFFOztJQUV4QyxNQUFNLE9BQU8sb0JBQW9CLEVBQUU7UUFDaEM7O1FBQVMsR0FBRyxJQUFJOztJQUVuQixTQUFTLEVBQUUsT0FBTztRQUNmOztRQUFZLEdBQUcsTUFBTTs7V0FFeEIsRUFBRTs7O0lBR0YsV0FBWTtJQUNaLE9BQVEifQ==
//# sourceURL=../kode/commit.kode
