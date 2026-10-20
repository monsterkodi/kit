var colour, err, io, kit, out, USAGE

import status from "./status.js"

import add from "./add.js"

import commit from "./commit.js"

import log from "./log.js"

import diff from "./diff.js"

import theme from "./theme.js"

USAGE = `kit — a git wrapper

  kit status [path…]      report the working tree, silent when clean and in sync.
                          a directory that is not a repository is looked into one level down.
  kit add [path…]         stage changes, then show what was staged.
  kit commit [words…]     stage, then commit using the words as the message.
  kit log [n] [-l]        one line per commit, -l the full message, n the count.
                          -f lists the files it touched.
  kit diff [id…]          the staged and unstaged changes, or the diff of one commit:
                          -1 is the last commit, a ref names one, paths narrow it down.`

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

        case 'diff':
            return process.exit(diff.diff(rest,io,{theme:palette}))

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2l0LmpzIiwic291cmNlcyI6WyIuLi9rb2RlL2tpdC5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQXFCQSxRQUFROzs7Ozs7Ozs7OztBQWFSOztXQUFhLFFBQVEsT0FBTyxNQUFNLElBQUk7OztBQUN0Qzs7V0FBYSxRQUFRLE9BQU8sTUFBTSxJQUFJOztBQUV0QyxNQUNJLElBQUssSUFDTCxNQUFPO0FBSVgsU0FBUyxRQUFRLFFBQVEsT0FBTyxXQUFlLFFBQVEsSUFBSSxZQUFhLFFBQVEsSUFBSSxTQUFROztBQUU1Rjs7OztJQUVJLE9BQU8sUUFBUSxLQUFLLE1BQU07SUFDMUIsTUFBTSxLQUFLO0lBQ1gsT0FBTyxLQUFLLE1BQU07SUFFbEIsVUFBVSxNQUFNLFlBQVk7WUFFckI7O2FBRUg7bUJBQ0ksUUFBUSxLQUFLLE9BQU8sT0FBTyxLQUFNLElBQUssTUFBTzs7YUFFakQ7bUJBQ0ksUUFBUSxLQUFLLElBQUksSUFBSSxLQUFNLElBQUssTUFBTzs7YUFFM0M7bUJBQ0ksUUFBUSxLQUFLLE9BQU8sT0FBTyxLQUFNLElBQUssTUFBTzs7YUFFakQ7bUJBQ0ksUUFBUSxLQUFLLElBQUksSUFBSSxLQUFNLElBQUssTUFBTzs7YUFFM0M7bUJBQ0ksUUFBUSxLQUFLLEtBQUssS0FBSyxLQUFNLElBQUssTUFBTzs7YUFFN0M7YUFDQTthQUNBO1lBQ0ksR0FBRyxJQUFJO21CQUNQLFFBQVEsS0FBSzs7YUFFakI7WUFDSSxHQUFHLElBQUk7bUJBQ1AsUUFBUSxLQUFLOzs7WUFHYixHQUFHLCtCQUErQjtZQUNsQyxHQUFHLE1BQU07WUFDVCxHQUFHLE1BQU07bUJBQ1QsUUFBUSxLQUFLOzs7O2VBRWxCIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/kit.kode
