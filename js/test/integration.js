var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var a, added, b, bare, blanked, cases, clean, code, committed, datedRepo, dateOf, dates, dir, dirty, dirtyRepo, env, files, FIRST, forward, full, hashes, hours, inner, invoke, io, len, line, lines, local, localDate, long, missing, n, name, nest, newRepo, older, out, outer, p, parent, plan, r, repo, repoWithCommits, reverse, runAdd, runCommit, runLog, runStatus, s, SECOND, short, sink, staged, stranger, theirs, THIRD, twoSiblings, w, want, withCwd, withRemote, _1093_55_

import fs from "fs"
import os from "os"
import path from "path"
import child_process from "child_process"

import status from "../status.js"

import add from "../add.js"

import commit from "../commit.js"

import log from "../log.js"

import diff from "../diff.js"

import git from "../git.js"

import style from "./style.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches


newRepo = function (where)
{
    var branch, cleanup, dir, env, git, own

    own = where === undefined
    dir = own ? fs.mkdtempSync(path.join(os.tmpdir(),'kit-test-')) : where
    if (!own)
    {
        fs.mkdirSync(dir,{recursive:true})
    }
    env = Object.assign({},process.env,{GIT_AUTHOR_NAME:'test',GIT_AUTHOR_EMAIL:'t@e.st',GIT_COMMITTER_NAME:'test',GIT_COMMITTER_EMAIL:'t@e.st'})
    git = function (...args)
    {
        return child_process.execFileSync('git',['-c','user.email=t@e.st','-c','user.name=test'].concat(args),{cwd:dir,encoding:'utf8',env:env})
    }
    git('init','-q')
    git('symbolic-ref','HEAD','refs/heads/test')
    branch = git('symbolic-ref','--short','HEAD').trim()
    if (own)
    {
        cleanup = function ()
        {
            return fs.rmSync(dir,{recursive:true,force:true})
        }
    }
    else
    {
        cleanup = function ()
        {}
    }
    return {dir:dir,git:git,env:env,branch:branch,cleanup:cleanup}
}

sink = function ()
{
    var err, error, log, out, text

    out = []
    err = []
    log = function (s)
    {
        return out.push(s)
    }
    error = function (s)
    {
        return err.push(s)
    }
    text = function ()
    {
        return out.join('\n')
    }
    return {out:out,err:err,log:log,error:error,text:text,opts:{theme:style.plainTheme}}
}

withCwd = function (dir, fn)
{
    var prev, r

    prev = process.cwd()
    process.chdir(dir)
    try
    {
        r = fn()
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        process.chdir(prev)
    }
    return r
}

withRemote = function ()
{
    var local, origin, other, parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-remote-'))
    origin = path.join(parent,'origin.git')
    fs.mkdirSync(origin)
    child_process.execFileSync('git',['init','-q','--bare','.'],{cwd:origin,stdio:'pipe'})
    child_process.execFileSync('git',['symbolic-ref','HEAD','refs/heads/test'],{cwd:origin,stdio:'pipe'})
    local = newRepo(path.join(parent,'local'))
    local.git('remote','add','origin',origin)
    fs.writeFileSync(path.join(local.dir,'a.txt'),'a\n')
    local.git('add','-A')
    local.git('commit','-qm','init')
    local.git('push','-q','-u','origin',local.branch)
    other = function ()
    {
        var dir, git

        dir = path.join(parent,'other')
        child_process.execFileSync('git',['clone','-q',origin,dir],{encoding:'utf8',env:local.env})
        git = function (...args)
        {
            return child_process.execFileSync('git',['-c','user.email=t@e.st','-c','user.name=test'].concat(args),{cwd:dir,encoding:'utf8',env:local.env})
        }
        return {dir:dir,git:git}
    }
    return {parent:parent,local:local,other:other}
}

dirtyRepo = function (where)
{
    var r

    r = newRepo(where)
    fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
    r.git('add','-A')
    r.git('commit','-qm','init')
    fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
    return r
}

twoSiblings = function ()
{
    var parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-paths-'))
    return {parent:parent,a:dirtyRepo(path.join(parent,'a')),b:dirtyRepo(path.join(parent,'b'))}
}

nest = function ()
{
    var parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-nest-'))
    return {parent:parent,a:dirtyRepo(path.join(parent,'a')),b:dirtyRepo(path.join(parent,'b'))}
}

repoWithCommits = function (n)
{
    var i, r

    r = newRepo()
    for (var _a_ = i = 1, _b_ = n + 1; (_a_ <= _b_ ? i < n + 1 : i > n + 1); (_a_ <= _b_ ? ++i : --i))
    {
        fs.writeFileSync(path.join(r.dir,`f${i}.txt`),`${i}\n`)
        r.git('add','-A')
        r.git('commit','-qm',`commit ${i}`)
    }
    return r
}

datedRepo = function ()
{
    var dated, r

    r = newRepo()
    dated = function (msg, iso)
    {
        var env

        fs.writeFileSync(path.join(r.dir,`${msg}.txt`),`${msg}\n`)
        r.git('add','-A')
        env = Object.assign({},r.env,{GIT_AUTHOR_DATE:iso,GIT_COMMITTER_DATE:iso})
        return child_process.execFileSync('git',['commit','-qm',msg],{cwd:r.dir,encoding:'utf8',env:env})
    }
    dated('first','2020-05-04T09:15:00 +0000')
    dated('second','2020-05-04T11:45:00 +0000')
    dated('third','2020-06-07T08:30:00 +0000')
    return r
}

dateOf = function (line)
{
    return line.slice(8,20)
}

localDate = function (month, iso, minutes)
{
    var d, day

    d = new Date(iso)
    day = String(d.getDate()).padStart(2,' ')
    return `${month} ${day} ${String(d.getHours()).padStart(2,'0')}:${minutes}`
}

blanked = function (date)
{
    return ' '.repeat(date.length - 5) + date.slice(-5)
}
FIRST = localDate('May','2020-05-04T09:15:00Z','15')
SECOND = localDate('May','2020-05-04T11:45:00Z','45')
THIRD = localDate('Jun','2020-06-07T08:30:00Z','30')
toExport["messageFor"] = async function ()
{
    await section("joins words like the bash function did", async function ()
    {
        compare(commit.messageFor(['this','is','a','commit','message']),'this is a commit message')
        compare(commit.messageFor(['fix','   the','  thing']),'fix    the   thing')
        compare(commit.messageFor([]),'misc')
        compare(commit.messageFor(['']),'misc')
        compare(commit.messageFor(['   ']),'misc')
    })
}
toExport["messageFor"]._section_ = true
toExport["status"] = async function ()
{
    await section("a clean repo is completely silent and exits 0", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("a clean tree in sync with its remote stays silent", async function ()
    {
        w = withRemote()
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'')
        fs.rmSync(w.parent,{recursive:true,force:true})
    })
    await section("a clean tree ahead of its remote prints the header alone", async function ()
    {
        w = withRemote()
        fs.writeFileSync(path.join(w.local.dir,'b.txt'),'b\n')
        w.local.git('add','-A')
        w.local.git('commit','-qm','unpushed')
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        out = style.plain(io.text())
        compare(out.split('\n').length,1)
        matches(out,style.headerOf(w.local.dir,`${w.local.branch} ↑1`))
        fs.rmSync(w.parent,{recursive:true,force:true})
    })
    await section("a clean tree behind its remote prints the header alone", async function ()
    {
        w = withRemote()
        theirs = w.other()
        fs.writeFileSync(path.join(theirs.dir,'b.txt'),'b\n')
        theirs.git('add','-A')
        theirs.git('commit','-qm','theirs')
        theirs.git('push','-q','origin',w.local.branch)
        w.local.git('fetch','-q')
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        out = style.plain(io.text())
        compare(out.split('\n').length,1)
        matches(out,style.headerOf(w.local.dir,`${w.local.branch} ↓1`))
        fs.rmSync(w.parent,{recursive:true,force:true})
    })
    await section("a remote that has never been pushed to stays silent", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        r.git('remote','add','origin',path.join(r.dir,'nowhere.git'))
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("a dirty repo prints branch, sections and untracked dir collapsed", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        fs.mkdirSync(path.join(r.dir,'build','deep'),{recursive:true})
        fs.writeFileSync(path.join(r.dir,'build','deep','x.txt'),'x\n')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        matches(io.text(),style.headerOf(r.dir,r.branch))
        matches(io.text(),style.headingOf('unstaged'))
        matches(io.text(),style.headingOf('untracked'))
        matches(io.text(),/\?\x20build\//)
        notMatches(io.text(),/build\/deep\/x\.txt/)
        r.cleanup()
    })
    await section("unaffected by the committed view — still says staged, uppercase", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        r.git('add','a.txt')
        io = sink()
        withCwd(r.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        out = io.text()
        matches(out,style.headingOf('staged'))
        notMatches(out,/committed/)
        matches(out,/M\x20a\.txt/)
        r.cleanup()
    })
    await section("the header names the repository root, not the directory run in", async function ()
    {
        r = dirtyRepo()
        fs.mkdirSync(path.join(r.dir,'sub'))
        io = sink()
        code = withCwd(path.join(r.dir,'sub'),function ()
        {
            return status.status([],io,io.opts)
        })
        compare(code,0)
        matches(io.text(),style.headerOf(r.dir,r.branch))
        matches(io.text(),/M\x20\.\.\/a\.txt/)
        r.cleanup()
    })
    await section("a path argument reports that repository", async function ()
    {
        r = dirtyRepo()
        io = sink()
        compare(status.status([r.dir],io,io.opts),0)
        matches(io.text(),style.headerOf(r.dir,r.branch))
        matches(io.text(),/M\x20a\.txt/)
        r.cleanup()
    })
    await section("two paths give two reports, in the order given", async function ()
    {
        s = twoSiblings()
        forward = sink()
        compare(status.status([s.a.dir,s.b.dir],forward,forward.opts),0)
        matches(forward.text(),style.headerOf(s.a.dir,s.a.branch))
        matches(forward.text(),style.headerOf(s.b.dir,s.b.branch))
        compare(forward.text().indexOf(s.a.dir) < forward.text().indexOf(s.b.dir),true)
        reverse = sink()
        compare(status.status([s.b.dir,s.a.dir],reverse,reverse.opts),0)
        compare(reverse.text().indexOf(s.b.dir) < reverse.text().indexOf(s.a.dir),true)
        fs.rmSync(s.parent,{recursive:true,force:true})
    })
    await section("a path argument replaces the current directory, it is not added to it", async function ()
    {
        s = twoSiblings()
        io = sink()
        code = withCwd(s.a.dir,function ()
        {
            return status.status([s.b.dir],io,io.opts)
        })
        compare(code,0)
        matches(io.text(),style.headerOf(s.b.dir,s.b.branch))
        compare(!io.text().includes(s.a.dir),true)
        fs.rmSync(s.parent,{recursive:true,force:true})
    })
    await section("relative paths resolve against the directory kit started in", async function ()
    {
        s = twoSiblings()
        io = sink()
        code = withCwd(s.a.dir,function ()
        {
            return status.status(['.','../b'],io,io.opts)
        })
        compare(code,0)
        matches(io.text(),style.headerOf(s.a.dir,s.a.branch))
        matches(io.text(),style.headerOf(s.b.dir,s.b.branch))
        fs.rmSync(s.parent,{recursive:true,force:true})
    })
    await section("a relative path from a subdirectory climbs back out", async function ()
    {
        s = twoSiblings()
        fs.mkdirSync(path.join(s.a.dir,'sub'))
        io = sink()
        code = withCwd(path.join(s.a.dir,'sub'),function ()
        {
            return status.status(['../../b'],io,io.opts)
        })
        compare(code,0)
        matches(io.text(),style.headerOf(s.b.dir,s.b.branch))
        fs.rmSync(s.parent,{recursive:true,force:true})
    })
    await section("a clean repository in the list contributes nothing", async function ()
    {
        parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-paths-'))
        dirty = dirtyRepo(path.join(parent,'dirty'))
        clean = newRepo(path.join(parent,'clean'))
        fs.writeFileSync(path.join(clean.dir,'a.txt'),'a\n')
        clean.git('add','-A')
        clean.git('commit','-qm','init')
        io = sink()
        compare(status.status([clean.dir,dirty.dir],io,io.opts),0)
        matches(io.text(),style.headerOf(dirty.dir,dirty.branch))
        compare(!io.text().includes(clean.dir),true)
        fs.rmSync(parent,{recursive:true,force:true})
    })
    await section("a path that is not a repository is named, and the rest still report", async function ()
    {
        r = dirtyRepo()
        stranger = fs.mkdtempSync(path.join(os.tmpdir(),'kit-stranger-'))
        io = sink()
        code = status.status([r.dir,stranger],io,io.opts)
        compare(code,128)
        compare(io.err.join('\n').includes(stranger),true)
        matches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        matches(io.text(),style.headerOf(r.dir,r.branch))
        fs.rmSync(stranger,{recursive:true,force:true})
        r.cleanup()
    })
    await section("a path that does not exist is reported as such, not as a bad repo", async function ()
    {
        missing = path.join(os.tmpdir(),'kit-absent-42')
        io = sink()
        code = status.status([missing],io,io.opts)
        compare(code,128)
        compare(io.err.join('\n').includes(missing),true)
        matches(io.err.join('\n'),/no\x20such\x20directory/)
        notMatches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        compare(io.text(),'')
    })
    await section("a bare repository and a .git directory are not work trees", async function ()
    {
        parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-bare-'))
        bare = path.join(parent,'bare.git')
        fs.mkdirSync(bare)
        child_process.execFileSync('git',['init','-q','--bare','.'],{cwd:bare,stdio:'pipe'})
        repo = newRepo(path.join(parent,'repo'))
        var list = [bare,path.join(repo.dir,'.git')]
        for (var _c_ = 0; _c_ < list.length; _c_++)
        {
            p = list[_c_]
            io = sink()
            compare(status.status([p],io,io.opts),128)
            matches(io.err.join('\n'),/no\x20work\x20tree/)
            compare(io.text(),'')
        }
        fs.rmSync(parent,{recursive:true,force:true})
    })
    await section("a directory that is not a repository reports the ones one level down", async function ()
    {
        n = nest()
        io = sink()
        compare(status.status([n.parent],io,io.opts),0)
        matches(io.text(),style.headerOf(n.a.dir,n.a.branch))
        matches(io.text(),style.headerOf(n.b.dir,n.b.branch))
        compare(io.text().indexOf(n.a.dir) < io.text().indexOf(n.b.dir),true)
        compare(io.err.length,0)
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
    await section("the shell directory is looked one level down too", async function ()
    {
        n = nest()
        io = sink()
        compare(withCwd(n.parent,function ()
        {
            return status.status([],io,io.opts)
        }),0)
        matches(io.text(),style.headerOf(n.a.dir,n.a.branch))
        matches(io.text(),style.headerOf(n.b.dir,n.b.branch))
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
    await section("a clean repository one level down contributes nothing", async function ()
    {
        n = nest()
        clean = newRepo(path.join(n.parent,'clean'))
        fs.writeFileSync(path.join(clean.dir,'a.txt'),'a\n')
        clean.git('add','-A')
        clean.git('commit','-qm','init')
        io = sink()
        compare(status.status([n.parent],io,io.opts),0)
        matches(io.text(),style.headerOf(n.a.dir,n.a.branch))
        compare(!io.text().includes(clean.dir),true)
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
    await section("a directory with no repository below it is still not a repository", async function ()
    {
        parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-empty-'))
        io = sink()
        compare(status.status([parent],io,io.opts),128)
        matches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        compare(io.err.join('\n').includes(parent),true)
        compare(io.text(),'')
        fs.rmSync(parent,{recursive:true,force:true})
    })
    await section("a plain file below a directory is not a repository to report", async function ()
    {
        n = nest()
        fs.writeFileSync(path.join(n.parent,'a','notes.txt'),'x\n')
        io = sink()
        compare(status.status([path.join(n.parent,'a','notes.txt')],io,io.opts),128)
        matches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
    await section("dot directories and plain directories one level down are skipped", async function ()
    {
        n = nest()
        fs.mkdirSync(path.join(n.parent,'.cache'))
        dirtyRepo(path.join(n.parent,'.cache','hidden'))
        fs.mkdirSync(path.join(n.parent,'notes'))
        io = sink()
        compare(status.status([n.parent],io,io.opts),0)
        matches(io.text(),style.headerOf(n.a.dir,n.a.branch))
        compare(!io.text().includes('hidden'),true)
        compare(!io.text().includes('notes'),true)
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
    await section("a repository reached through a symlink one level down is reported", async function ()
    {
        n = nest()
        fs.symlinkSync(n.a.dir,path.join(n.parent,'linked'),'dir')
        io = sink()
        compare(status.status([n.parent],io,io.opts),0)
        matches(io.text(),style.headerOf(n.a.dir,n.a.branch))
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
    await section("a repository that contains another repository reports only itself", async function ()
    {
        outer = dirtyRepo()
        inner = dirtyRepo(path.join(outer.dir,'inner'))
        io = sink()
        compare(status.status([outer.dir],io,io.opts),0)
        matches(io.text(),style.headerOf(outer.dir,outer.branch))
        notMatches(io.text(),style.headerOf(inner.dir,inner.branch))
        outer.cleanup()
    })
    await section("one bad path among repositories that are looked into still exits 128", async function ()
    {
        n = nest()
        stranger = fs.mkdtempSync(path.join(os.tmpdir(),'kit-stranger-'))
        io = sink()
        compare(status.status([n.parent,stranger],io,io.opts),128)
        matches(io.text(),style.headerOf(n.a.dir,n.a.branch))
        matches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        fs.rmSync(stranger,{recursive:true,force:true})
        fs.rmSync(n.parent,{recursive:true,force:true})
    })
}
toExport["status"]._section_ = true
toExport["add"] = async function ()
{
    await section("stages new files (the -A vs . behaviour) and reports them", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'new.txt'),'n\n')
        io = sink()
        withCwd(r.dir,function ()
        {
            return add.add([],io,io.opts)
        })
        staged = r.git('diff','--cached','--name-only')
        matches(staged,/new\.txt/)
        matches(io.text(),/A\x20new\.txt/)
        r.cleanup()
    })
    await section("explicit paths are forwarded", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'aa\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'bb\n')
        io = sink()
        withCwd(r.dir,function ()
        {
            return add.add(['a.txt'],io,io.opts)
        })
        staged = r.git('diff','--cached','--name-only')
        matches(staged,/a\.txt/)
        notMatches(staged,/b\.txt/)
        r.cleanup()
    })
    await section("a clean tree stays silent", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        withCwd(r.dir,function ()
        {
            return add.add([],io,io.opts)
        })
        compare(io.text(),'')
        r.cleanup()
    })
    await section("unaffected by the committed view — still says staged, uppercase", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        io = sink()
        withCwd(r.dir,function ()
        {
            return add.add([],io,io.opts)
        })
        out = io.text()
        matches(out,style.headingOf('staged'))
        notMatches(out,/committed/)
        matches(out,/M\x20a\.txt/)
        r.cleanup()
    })
}
toExport["add"]._section_ = true
toExport["commit"] = async function ()
{
    await section("nothing to commit while ahead prints the header rather than silence", async function ()
    {
        w = withRemote()
        fs.writeFileSync(path.join(w.local.dir,'b.txt'),'b\n')
        w.local.git('add','-A')
        w.local.git('commit','-qm','unpushed')
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        compare(code,1)
        matches(style.plain(io.text()),style.headerOf(w.local.dir,`${w.local.branch} ↑1`))
        notMatches(io.text(),/nothing\x20added\x20to\x20commit/)
        fs.rmSync(w.parent,{recursive:true,force:true})
    })
    await section("words become the message, new files included", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        fs.writeFileSync(path.join(r.dir,'brand.txt'),'new\n')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return commit.commit(['fix','the','prompt'],io,io.opts)
        })
        compare(code,0)
        compare(r.git('log','-1','--pretty=%s').trim(),'fix the prompt')
        files = r.git('show','--name-only','--pretty=format:','HEAD')
        matches(files,/brand\.txt/)
        r.cleanup()
    })
    await section("no words uses the hardcoded misc message", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        io = sink()
        withCwd(r.dir,function ()
        {
            return commit.commit([],io,io.opts)
        })
        compare(r.git('log','-1','--pretty=%s').trim(),'misc')
        r.cleanup()
    })
    await section("shows the state it is about to commit, labelled committed", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        fs.writeFileSync(path.join(r.dir,'brand.txt'),'new\n')
        io = sink()
        withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        out = io.text()
        matches(out,/committed/)
        notMatches(out,style.headingOf('staged'))
        matches(out,/a\x20brand\.txt/)
        matches(out,/m\x20a\.txt/)
        r.cleanup()
    })
    await section("from a subdirectory, unstaged keeps uppercase letters", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        fs.mkdirSync(path.join(r.dir,'sub'),{recursive:true})
        fs.writeFileSync(path.join(r.dir,'sub','keep.txt'),'k\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'top-level change\n')
        fs.writeFileSync(path.join(r.dir,'sub','keep.txt'),'changed\n')
        io = sink()
        withCwd(path.join(r.dir,'sub'),function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        out = io.text()
        matches(out,style.headingOf('committed'))
        matches(out,/m\x20keep\.txt/)
        matches(out,style.headingOf('unstaged'))
        matches(out,/M\x20\.\.\/a\.txt/)
        r.cleanup()
    })
    await section("nothing to commit exits 1 and stays silent on a clean tree", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        compare(code,1)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("a fully clean tree is silent", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        compare(code,1)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("a no-op from a subdirectory is silent, not git prose", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.mkdirSync(path.join(r.dir,'sub'),{recursive:true})
        fs.writeFileSync(path.join(r.dir,'sub','keep.txt'),'k\n')
        r.git('add','-A')
        r.git('commit','-qm','add sub')
        fs.writeFileSync(path.join(r.dir,'scratch.tmp'),'x\n')
        io = sink()
        code = withCwd(path.join(r.dir,'sub'),function ()
        {
            return commit.commit(['noop'],io,io.opts)
        })
        compare(code,1)
        notMatches(io.text(),/nothing\x20added\x20to\x20commit/)
        notMatches(io.text(),/untracked\x20files\x20present/)
        r.cleanup()
    })
}
toExport["commit"]._section_ = true
toExport["commands"] = async function ()
{
    await section("not a git repository exits 128", async function ()
    {
        dir = fs.mkdtempSync(path.join(os.tmpdir(),'kit-norepo-'))
        runStatus = function (io)
        {
            return status.status([],io,io.opts)
        }
        runAdd = function (io)
        {
            return add.add([],io,io.opts)
        }
        runCommit = function (io)
        {
            return commit.commit(['x'],io,io.opts)
        }
        runLog = function (io)
        {
            return log.log([],io,io.opts)
        }
        cases = [['status',runStatus],['add',runAdd],['commit',runCommit],['log',runLog]]
        var list1 = _k_.list(cases)
        for (var _d_ = 0; _d_ < list1.length; _d_++)
        {
            name = list1[_d_][0]
            invoke = list1[_d_][1]
            io = sink()
            code = withCwd(dir,function ()
            {
                return invoke(io)
            })
            compare(code,128)
            matches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        }
        fs.rmSync(dir,{recursive:true,force:true})
    })
    await section("the header names the repository root too", async function ()
    {
        r = dirtyRepo()
        added = sink()
        withCwd(r.dir,function ()
        {
            return add.add([],added,added.opts)
        })
        matches(added.text(),style.headerOf(r.dir,r.branch))
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        committed = sink()
        withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],committed,committed.opts)
        })
        matches(committed.text(),style.headerOf(r.dir,r.branch))
        matches(committed.text(),style.headingOf('committed'))
        r.cleanup()
    })
}
toExport["commands"]._section_ = true
toExport["log"] = async function ()
{
    await section("an empty history is silent and exits 0", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("lists every commit, oldest first", async function ()
    {
        r = repoWithCommits(3)
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        lines = io.text().split('\n')
        compare(lines.length,3)
        matches(lines[0],/commit\x201$/)
        matches(lines[2],/commit\x203$/)
        r.cleanup()
    })
    await section("a bare number limits to that many commits", async function ()
    {
        r = repoWithCommits(5)
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['2'],io,io.opts)
        })
        lines = io.text().split('\n')
        compare(lines.length,2)
        matches(lines[0],/commit\x204$/)
        matches(lines[1],/commit\x205$/)
        older = lines.filter(function (l)
        {
            return (/commit\x20[123]$/).test(l)
        })
        compare(older.length,0)
        r.cleanup()
    })
    await section("zero is silent", async function ()
    {
        r = repoWithCommits(3)
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['0'],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("shows a short hash and never a full 40-character one", async function ()
    {
        r = repoWithCommits(1)
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        line = io.text()
        full = r.git('rev-parse','HEAD').trim()
        compare(line.includes(full.slice(0,7)),true)
        compare(!line.includes(full),true)
        r.cleanup()
    })
    await section("shows the author name without the email address", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        env = Object.assign({},r.env,{GIT_AUTHOR_NAME:'Thorsten',GIT_COMMITTER_NAME:'Thorsten',GIT_AUTHOR_EMAIL:'t@e.st'})
        child_process.execFileSync('git',['commit','-qm','authored'],{cwd:r.dir,encoding:'utf8',env:env})
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        line = io.text()
        matches(line,/Thorsten/)
        compare(!line.includes('t@e.st'),true)
        r.cleanup()
    })
    await section("the date is the short absolute form without seconds", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        env = Object.assign({},r.env,{GIT_AUTHOR_DATE:'2020-01-02T03:04:05 +0000'})
        child_process.execFileSync('git',['commit','-qm','dated'],{cwd:r.dir,encoding:'utf8',env:env})
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        local = new Date('2020-01-02T03:04:05Z')
        hours = String(local.getHours()).padStart(2,'0')
        want = `Jan  ${local.getDate()} ${hours}:04`
        compare(io.text().includes(want),true)
        compare(!(/03:04:\d\d/).test(io.text()),true)
        compare(!(/2020/).test(io.text()),true)
        r.cleanup()
    })
    await section("a date the line above already gave is blanked to spaces", async function ()
    {
        r = datedRepo()
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,Object.assign({},io.opts,{width:200}))
        })
        dates = io.text().split('\n').map(dateOf)
        compare(dates[0],FIRST)
        compare(dates[1],blanked(SECOND))
        compare(dates[2],THIRD)
        r.cleanup()
    })
    await section("-l writes the date on every line, blanked or not", async function ()
    {
        r = datedRepo()
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l'],io,Object.assign({},io.opts,{width:200}))
        })
        compare(io.text().split('\n').map(dateOf),[FIRST,SECOND,THIRD])
        r.cleanup()
    })
    await section("a non-numeric argument errors instead of printing everything", async function ()
    {
        r = repoWithCommits(3)
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['foo'],io,io.opts)
        })
        compare(code,1)
        compare(io.text(),'')
        matches(io.err.join('\n'),/not\x20a\x20commit\x20count/)
        r.cleanup()
    })
    await section("-l shows the commit body, which short mode hides", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        fs.writeFileSync(path.join(r.dir,'msg.txt'),'the subject line\n\nA body paragraph that only --long shows.\n\nAnd a second one.')
        r.git('commit','-q','-F','msg.txt')
        short = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],short,Object.assign({},short.opts,{width:200}))
        })
        matches(short.text(),/the\x20subject\x20line/)
        compare(!short.text().includes('A body paragraph'),true)
        long = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l'],long,Object.assign({},long.opts,{width:200}))
        })
        matches(long.text(),/A\x20body\x20paragraph/)
        matches(long.text(),/And\x20a\x20second\x20one\./)
        r.cleanup()
    })
    await section("-l and --long are equivalent", async function ()
    {
        r = repoWithCommits(2)
        a = sink()
        b = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l','2'],a,Object.assign({},a.opts,{width:100}))
        })
        withCwd(r.dir,function ()
        {
            return log.log(['--long','2'],b,Object.assign({},b.opts,{width:100}))
        })
        compare(a.text(),b.text())
        r.cleanup()
    })
    await section("-l with a count returns exactly that many commits", async function ()
    {
        r = repoWithCommits(5)
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l','2'],io,Object.assign({},io.opts,{width:100}))
        })
        hashes = ((_1093_55_=io.text().match(/^[0-9a-f]{7}\x20/gm)) != null ? _1093_55_ : [])
        compare(hashes.length,2)
        r.cleanup()
    })
    await section("-l 0 is silent", async function ()
    {
        r = repoWithCommits(3)
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['-l','0'],io,Object.assign({},io.opts,{width:100}))
        })
        compare(code,0)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("the output respects the terminal width it is given", async function ()
    {
        r = repoWithCommits(1)
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,Object.assign({},io.opts,{width:80}))
        })
        line = io.text().replace(/\u001b\[[0-9;]*m/g,'')
        len = Array.from(line).length
        compare(len <= 80,true)
        r.cleanup()
    })
    await section("a subject with spaces and colons is preserved", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','fix: handle empty tree and  spaces')
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        matches(io.text(),/fix:\x20handle\x20empty\x20tree\x20and\x20{2}spaces$/)
        r.cleanup()
    })
}
toExport["log"]._section_ = true
toExport["diff"] = async function ()
{
    await section("a clean tree has no diff at all", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return diff.diff([],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'')
        r.cleanup()
    })
    await section("not a git repository exits 128", async function ()
    {
        dir = fs.mkdtempSync(path.join(os.tmpdir(),'kit-norepo-'))
        io = sink()
        code = withCwd(dir,function ()
        {
            return diff.diff([],io,io.opts)
        })
        compare(code,128)
        matches(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        fs.rmSync(dir,{recursive:true,force:true})
    })
    await section("a bad argument is refused before git is asked", async function ()
    {
        r = newRepo()
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return diff.diff(['--stat'],io,io.opts)
        })
        compare(code,1)
        matches(io.err.join('\n'),/not\x20a\x20commit\x20number/)
        r.cleanup()
    })
    await section("the last commit shows what it changed", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        r.git('add','-A')
        r.git('commit','-qm','second')
        plan = diff.parseArgs(['-1'],function ()
        {
            return false
        })
        out = withCwd(r.dir,function ()
        {
            return diff.gitCommands(git.commitAt(plan.target.number),plan.paths).map(function (c)
            {
                return git.capture(c)
            }).join('\n')
        })
        matches(out,/a\.txt/)
        matches(out,/changed/)
        r.cleanup()
    })
    await section("a negative number shows that one commit, not the range before it", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        r.git('add','-A')
        r.git('commit','-qm','second')
        fs.writeFileSync(path.join(r.dir,'c.txt'),'c\n')
        r.git('add','-A')
        r.git('commit','-qm','third')
        plan = diff.parseArgs(['-3'],function ()
        {
            return false
        })
        out = withCwd(r.dir,function ()
        {
            return diff.gitCommands(git.commitAt(plan.target.number),plan.paths).map(function (c)
            {
                return git.capture(c)
            }).join('\n')
        })
        matches(out,/a\.txt/)
        compare(!out.includes('b.txt'),true)
        compare(!out.includes('c.txt'),true)
        r.cleanup()
    })
    await section("a number that counts too far back is an error", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return diff.diff(['-5'],io,io.opts)
        })
        compare(code,128)
        matches(io.err.join('\n'),/not\x20a\x20commit\x20count/)
        r.cleanup()
    })
    await section("a path narrows the diff down", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'changed\n')
        plan = diff.parseArgs(['a.txt'],function ()
        {
            return false
        })
        out = withCwd(r.dir,function ()
        {
            return diff.gitCommands(plan.target,plan.paths).map(function (c)
            {
                return git.capture(c)
            }).join('\n')
        })
        matches(out,/a\.txt/)
        compare(!out.includes('b.txt'),true)
        r.cleanup()
    })
}
toExport["diff"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyYXRpb24uanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC9pbnRlZ3JhdGlvbi5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXVCQTs7OztJQUVJLE1BQU0sVUFBUztJQUNmLE1BQVMsTUFBUyxHQUFHLFlBQVksS0FBSyxLQUFLLEdBQUcsU0FBVSxnQkFBbUI7U0FDcEU7O1FBQVMsR0FBRyxVQUFVLEtBQU0sVUFBVzs7SUFFOUMsTUFBTSxPQUFPLFVBQVcsUUFBUSxLQUM1QixnQkFBaUIsT0FDakIsaUJBQWtCLFNBQ2xCLG1CQUFvQixPQUNwQixvQkFBcUI7SUFHekI7O2VBQ0ksY0FBYyxhQUFhLE9BQVEsS0FBSyxvQkFBb0IsS0FBSyxrQkFBa0IsT0FBTyxPQUN0RixJQUFLLElBQ0wsU0FBVSxPQUNWLElBQUs7O0lBR2IsSUFBSSxPQUFRO0lBS1osSUFBSSxlQUFnQixPQUFRO0lBRTVCLFNBQVMsSUFBSSxlQUFnQixVQUFXLFFBQVE7UUFFN0M7O1FBQVM7O21CQUFhLEdBQUcsT0FBTyxLQUFNLFVBQVcsS0FBTSxNQUFPOzs7OztRQUM1RDs7O1lBRUwsSUFBSyxJQUNMLElBQUssSUFDTCxJQUFLLElBQ0wsT0FBUSxPQUNSLFFBQVM7OztBQUViOzs7O0lBRUk7SUFDQTtJQUVBOztlQUFhLElBQUksS0FBSzs7SUFDdEI7O2VBQWUsSUFBSSxLQUFLOztJQUN4Qjs7ZUFBVSxJQUFJLEtBQUs7O1lBRW5CLElBQUssSUFDTCxJQUFLLElBQ0wsSUFBSyxJQUNMLE1BQU8sTUFDUCxLQUFNLEtBQ04sTUFBTyxNQUFPLE1BQU07OztBQU14Qjs7OztJQUVJLE9BQU8sUUFBUTtJQUNmLFFBQVEsTUFBTTs7O1FBR1YsSUFBSTs7V0FDRjs7UUFDRixNQUFNOzs7O1FBRU4sUUFBUSxNQUFNOztXQUVsQjs7O0FBRUo7Ozs7SUFFSSxTQUFTLEdBQUcsWUFBWSxLQUFLLEtBQUssR0FBRyxTQUFVO0lBQy9DLFNBQVMsS0FBSyxL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
//# sourceURL=file:///home/kodi/s/kit/kode/test/integration.kode
