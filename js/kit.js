var colour, err, io, kit, out, USAGE

import status from "./status.js"

import add from "./add.js"

import commit from "./commit.js"

import log from "./log.js"

import theme from "./theme.js"

USAGE = `kit — a git wrapper

  kit status [path…]      report the working tree, silent when clean and in sync.
                          a directory that is not a repository is looked into one level down.
  kit add [path…]         stage changes, then show what was staged.
  kit commit [words…]     stage, then commit using the words as the message.
  kit log [n] [-l]        one line per commit, -l the full message, n the count.`

out = function (s)
{
    return process.stdout.write(s + '\n')
}

err = function (s)
{
    return process.stderr.write(s + '\n')
}
io = {log:out,error:err}
colour = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== 'dumb'

kit = function ()
{
    var argv, cmd, palette, rest

    argv = process.argv.slice(2)
    cmd = argv[0]
    rest = argv.slice(1)
    palette = theme.createTheme(colour)
    switch (cmd)
    {
        case 'status':
            return process.exit(status.status(rest,io,{theme:palette}))

        case 'add':
            return process.exit(add.add(rest,io,{theme:palette}))

        case 'commit':
            return process.exit(commit.commit(rest,io,{theme:palette}))

        case 'log':
            return process.exit(log.log(rest,io,{theme:palette}))

        case '--help':
        case '-h':
        case 'help':
            io.log(USAGE)
            return process.exit(0)

        case undefined:
            io.log(USAGE)
            return process.exit(1)

        default:
            io.error(`kit: unknown command '${cmd}'`)
            io.error('')
            io.error(USAGE)
            return process.exit(1)
    }

}
export default kit;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2l0LmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2tpdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFvQkEsUUFBUTs7Ozs7Ozs7QUFVUjs7V0FBYSxRQUFRLE9BQU8sTUFBTSxJQUFJOzs7QUFDdEM7O1dBQWEsUUFBUSxPQUFPLE1BQU0sSUFBSTs7QUFFdEMsTUFDSSxJQUFLLElBQ0wsTUFBTztBQUlYLFNBQVMsUUFBUSxRQUFRLE9BQU8sV0FBZSxRQUFRLElBQUksWUFBYSxRQUFRLElBQUksU0FBUTs7QUFFNUY7Ozs7SUFFSSxPQUFPLFFBQVEsS0FBSyxNQUFNO0lBQzFCLE1BQU0sS0FBSztJQUNYLE9BQU8sS0FBSyxNQUFNO0lBRWxCLFVBQVUsTUFBTSxZQUFZO1lBRXJCOzthQUVIO21CQUNJLFFBQVEsS0FBSyxPQUFPLE9BQU8sS0FBTSxJQUFLLE1BQU87O2FBRWpEO21CQUNJLFFBQVEsS0FBSyxJQUFJLElBQUksS0FBTSxJQUFLLE1BQU87O2FBRTNDO21CQUNJLFFBQVEsS0FBSyxPQUFPLE9BQU8sS0FBTSxJQUFLLE1BQU87O2FBRWpEO21CQUNJLFFBQVEsS0FBSyxJQUFJLElBQUksS0FBTSxJQUFLLE1BQU87O2FBRTNDO2FBQ0E7YUFDQTtZQUNJLEdBQUcsSUFBSTttQkFDUCxRQUFRLEtBQUs7O2FBRWpCO1lBQ0ksR0FBRyxJQUFJO21CQUNQLFFBQVEsS0FBSzs7O1lBR2IsR0FBRywrQkFBK0I7WUFDbEMsR0FBRyxNQUFNO1lBQ1QsR0FBRyxNQUFNO21CQUNULFFBQVEsS0FBSzs7OztlQUVsQiJ9
//# sourceURL=file://kode/kit.kode
