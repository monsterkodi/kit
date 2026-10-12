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