# kit

A git wrapper: `status`, `add`, `commit`, `log`. Requires node, no dependencies, no build step.

    kit status [path...]      the working tree, silent when clean and in sync
    kit add [path...]         stage changes, then show what was staged
    kit commit [words...]     stage, then commit using the words as the message
    kit log [n] [-l]          one line per commit, optionally the full message

![kit status](img/status.png)

![kit log -l](img/log.png)

## Notes

- `kit commit` always stages first. For the rare cases where that is wrong,
  use git directly.
  
- recommended aliases:

```
alias ks="kit status"
alias ka="kit add"
alias kc="kit commit"
alias kl="kit log"
alias kll="kit log -l"
```                     

- then `kc hello world!` expands to `git commit -m "hello world!"`
  a nice simplification, but it comes with a caveat: be careful with characters that might get expanded by the shell.
  use quotes or fallback to git if in doubt.

## Install

```
    git clone https://github.com/monsterkodi/kit.git
```
