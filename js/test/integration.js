var toExport = {}
var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var a, added, b, bare, blanked, cases, clean, code, committed, datedRepo, dateOf, dates, dir, dirty, dirtyRepo, env, files, FIRST, forward, full, hashes, hours, inner, invoke, io, len, line, lines, local, localDate, long, missing, n, name, nest, newRepo, older, out, outer, p, parent, plan, r, repo, repoWithCommits, res, reverse, runAdd, runCommit, runLog, runStatus, s, SECOND, short, sink, staged, stranger, theirs, THIRD, twoSiblings, w, want, withCwd, withRemote, _1093_55_

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
    for (i = 1; i < n + 1; i++)
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
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            p = list[_a_]
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
        for (var _b_ = 0; _b_ < list1.length; _b_++)
        {
            name = list1[_b_][0]
            invoke = list1[_b_][1]
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
    await section("-f gives every commit the files it touched", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        r.git('add','-A')
        r.git('commit','-qm','second')
        res = withCwd(r.dir,function ()
        {
            return git.collectLog(2,{files:true})
        })
        compare(res.data[0].files.length,1)
        compare(res.data[0].files[0].code,'A')
        compare(res.data[0].files[0].path,'a.txt')
        compare(res.data[1].files.length,2)
        compare(res.data[1].files[0].code,'M')
        compare(res.data[1].files[0].path,'a.txt')
        compare(res.data[1].files[1].code,'A')
        compare(res.data[1].files[1].path,'b.txt')
        r.cleanup()
    })
    await section("-f with paths limits the listing to them", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.kode'),'a\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        res = withCwd(r.dir,function ()
        {
            return git.collectLog(1,{files:true,paths:['*.kode']})
        })
        compare(res.data[0].files.length,1)
        compare(res.data[0].files[0].path,'a.kode')
        r.cleanup()
    })
    await section("-f with a path limits the listing to that file", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        res = withCwd(r.dir,function ()
        {
            return git.collectLog(1,{files:true,paths:['b.txt']})
        })
        compare(res.data[0].files.length,1)
        compare(res.data[0].files[0].path,'b.txt')
        r.cleanup()
    })
    await section("the log shows the files of every commit", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-f'],io,Object.assign({},io.opts,{width:200}))
        })
        matches(io.text(),/a\.txt/)
        r.cleanup()
    })
    await section("a commit behind -f is refused, the log shows every commit", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['-f','HEAD'],io,io.opts)
        })
        compare(code,1)
        matches(io.err.join('\n'),/is\x20a\x20commit/)
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
    await section("a filter that matches nothing in a commit says so", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.kode'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','first')
        fs.writeFileSync(path.join(r.dir,'a.js'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','second')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return diff.diff(['.kode','-1'],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'no *.kode changes')
        r.cleanup()
    })
    await section("a filter that matches nothing in the working tree says so", async function ()
    {
        r = newRepo()
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return diff.diff(['.kode'],io,io.opts)
        })
        compare(code,0)
        compare(io.text(),'no *.kode changes')
        r.cleanup()
    })
}
toExport["diff"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyYXRpb24uanMiLCJzb3VyY2VzIjpbIi4uLy4uL2tvZGUvdGVzdC9pbnRlZ3JhdGlvbi5rb2RlIl0sIm1hcHBpbmdzIjoiOzs7OztPQWFJLFNBQUE7T0FBRyxTQUFBO09BQUcsV0FBQTtPQUFLLG9CQUFBOztPQUNSLGFBQUE7O09BQ0EsVUFBQTs7T0FDQSxhQUFBOzs7O09BRUEsV0FBQTs7T0FDQSxVQUFBOztPQUNELFlBQUE7O09BQ0EsY0FBQTtJQUFVO0lBQVE7OztBQUV4QixvQkFBVzs7OztJQUVQLE1BQU0sVUFBUztJQUNmLE1BQVMsTUFBUyxHQUFHLFlBQVksS0FBSyxLQUFLLEdBQUcsU0FBVSxnQkFBbUI7U0FDcEU7O1FBQVMsR0FBRyxVQUFVLEtBQU0sVUFBVzs7SUFFOUMsTUFBTSxPQUFPLFVBQVcsUUFBUSxLQUM1QixnQkFBaUIsT0FDakIsaUJBQWtCLFNBQ2xCLG1CQUFvQixPQUNwQixvQkFBcUI7SUFHekIsZ0JBQU87O2VBQ0gsY0FBYyxhQUFhLE9BQVEsS0FBSyxvQkFBb0IsS0FBSyxrQkFBa0IsT0FBTyxPQUN0RixJQUFLLElBQ0wsU0FBVSxPQUNWLElBQUs7O0lBR2IsSUFBSSxPQUFRO0lBS1osSUFBSSxlQUFnQixPQUFRO0lBRTVCLFNBQVMsSUFBSSxlQUFnQixVQUFXLFFBQVE7UUFFN0M7O1FBQVM7O21CQUFhLEdBQUcsT0FBTyxLQUFNLFVBQVcsS0FBTSxNQUFPOzs7OztRQUM1RDs7O1lBRUwsSUFBSyxJQUNMLElBQUssSUFDTCxJQUFLLElBQ0wsT0FBUSxPQUNSLFFBQVM7OztBQUViOzs7O0lBRUk7SUFDQTtJQUVBLGdCQUFPOztlQUFNLElBQUksS0FBSzs7SUFDdEIsa0JBQVM7O2VBQU0sSUFBSSxLQUFLOztJQUN4Qjs7ZUFBVSxJQUFJLEtBQUs7O1lBRW5CLElBQUssSUFDTCxJQUFLLElBQ0wsSUFBSyxJQUNMLE1BQU8sTUFDUCxLQUFNLEtBQ04sTUFBTyxNQUFPLE1BQU07OztBQU14QixvQkFBVyxLQUFLOzs7O0lBRVosT0FB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
//# sourceURL=../../kode/test/integration.kode
