# kit

A git wrapper: `status`, `add`, `commit`, `log`, `diff`. Requires node, no dependencies.

    kit status [path...]      the working tree, silent when clean and in sync
    kit add [path...]         stage changes, then show what was staged
    kit commit [words...]     stage, then commit using the words as the message
    kit log [n] [-l]          one line per commit, optionally the full message
    kit log -f                the files every commit touched
    kit diff [id...]          the staged and unstaged changes, or one commit

![kit status](img/status.png)

![kit log -l](img/log.png)

## Notes

- `kit commit` always stages first. For the rare cases where that is wrong,
  use git directly.

- `kit diff` is git's diff, not a rendering of it: git writes it and the pager
  and the diff viewer of your own setup show it.

```
kit diff                 the staged changes, then the unstaged ones
kit diff -1              the diff of the last commit, -2 the one before it
kit diff main            the diff of that commit
kit diff kode            only the kode tree
kit diff .kode           only the kode files
kit diff -1 kode         the last commit, kode files only
```

- `kit log -f` lists the files a commit touched. The arguments behind it limit
  the listing the same way they limit a diff, so `kit log -f .kode` lists the
  kode files, and `kit log -f js/diff.js` lists that file alone. A file type
  is a name: `kode` is the tree of that name, `.kode` is every file with that
  extension, and any number of them can be asked for at once.

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
