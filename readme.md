# kit

A git wrapper: `status`, `add`, `commit`, `log`, `diff`. Requires node, no dependencies.

    kit status [path...]      the working tree, silent when clean and in sync
    kit add [path...]         stage changes, then show what was staged
    kit commit [words...]     stage, then commit using the words as the message
    kit log [n] [-l] [-f]     one line per commit
                 -l                 display the full message body
                      -f            include the files every commit touched
    kit diff [id...]          the staged and unstaged changes, or one commit

![kit status](img/status.png)

![kit log -l](img/log.png)

## Notes

- `kit commit` always stages first. For the rare cases where that is wrong,
  use git directly.

- `kit diff` 

```
kit diff                 the staged changes, then the unstaged ones
kit diff -1              the diff of the last commit, -2 the one before it
kit diff <hash>          the diff of that commit
kit diff .js             only javascript files
kit diff -1 .kode        the last commit, kode files only
```

- recommended aliases:

```
alias ks="kit status"
alias ka="kit add"
alias kc="kit commit"
alias kl="kit log"
alias kd="kit diff"
alias kll="kit log -l"
```                     

- then `kc hello world!` expands to `git commit -m "hello world!"`
  a nice simplification, but it comes with a caveat: be careful with characters that might get expanded by the shell.
  use quotes or fallback to git if in doubt.

## Install

```
    git clone https://github.com/monsterkodi/kit.git
```
