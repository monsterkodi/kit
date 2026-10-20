var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var blanked, datedRepo, dateOf, dirtyRepo, FIRST, localDate, nest, newRepo, repoWithCommits, SECOND, sink, THIRD, twoSiblings, withCwd, withRemote

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from "fs"
import os from "os"
import path from "path"
import child_process from "child_process"

import status from "../status.js"

import add from "../add.js"

import commit from "../commit.js"

import log from "../log.js"

import style from "./style.js"


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
    branch = git('symbolic-ref','--short','HEAD').trim()
    assert.ok(branch,'git init should leave a named branch to read back')
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
    var prev

    prev = process.cwd()
    process.chdir(dir)
    try
    {
        return fn()
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return process.chdir(prev)
    }
}

withRemote = function ()
{
    var local, origin, other, parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-remote-'))
    origin = path.join(parent,'origin.git')
    fs.mkdirSync(origin)
    child_process.execFileSync('git',['init','-q','--bare','.'],{cwd:origin,stdio:'pipe'})
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
test('messageFor: joins words like the bash function did',function ()
{
    assert.equal(commit.messageFor(['this','is','a','commit','message']),'this is a commit message')
    assert.equal(commit.messageFor(['fix','   the','  thing']),'fix    the   thing')
    assert.equal(commit.messageFor([]),'misc')
    assert.equal(commit.messageFor(['']),'misc')
    return assert.equal(commit.messageFor(['   ']),'misc','whitespace-only collapses to the default')
})
test('status: clean repo is completely silent and exits 0',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        assert.equal(code,0)
        return assert.equal(io.text(),'','clean repo must print nothing at all')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('status: a clean tree in sync with its remote stays silent',function ()
{
    var code, io, w

    w = withRemote()
    try
    {
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        assert.equal(code,0)
        return assert.equal(io.text(),'','pushed and clean is nothing to say')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(w.parent,{recursive:true,force:true})
    }
})
test('status: a clean tree ahead of its remote prints the header alone',function ()
{
    var code, io, out, w

    w = withRemote()
    try
    {
        fs.writeFileSync(path.join(w.local.dir,'b.txt'),'b\n')
        w.local.git('add','-A')
        w.local.git('commit','-qm','unpushed')
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        assert.equal(code,0,'unpushed commits are not a failure')
        out = style.plain(io.text())
        assert.equal(out.split('\n').length,1,'the header, and nothing after it')
        return assert.match(out,style.headerOf(w.local.dir,`${w.local.branch} ↑1`))
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(w.parent,{recursive:true,force:true})
    }
})
test('status: a clean tree behind its remote prints the header alone',function ()
{
    var code, io, out, theirs, w

    w = withRemote()
    try
    {
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
        assert.equal(code,0)
        out = style.plain(io.text())
        assert.equal(out.split('\n').length,1)
        return assert.match(out,style.headerOf(w.local.dir,`${w.local.branch} ↓1`))
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(w.parent,{recursive:true,force:true})
    }
})
test('status: a remote that has never been pushed to stays silent',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        r.git('remote','add','origin',path.join(r.dir,'nowhere.git'))
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return status.status([],io,io.opts)
        })
        assert.equal(code,0)
        return assert.equal(io.text(),'','no upstream ref means no comparison')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: nothing to commit while ahead prints the header rather than silence',function ()
{
    var code, io, w

    w = withRemote()
    try
    {
        fs.writeFileSync(path.join(w.local.dir,'b.txt'),'b\n')
        w.local.git('add','-A')
        w.local.git('commit','-qm','unpushed')
        io = sink()
        code = withCwd(w.local.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        assert.equal(code,1,'git still has nothing to commit')
        assert.match(style.plain(io.text()),style.headerOf(w.local.dir,`${w.local.branch} ↑1`))
        return assert.doesNotMatch(io.text(),/nothing\x20added\x20to\x20commit/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(w.parent,{recursive:true,force:true})
    }
})
test('status: dirty repo prints branch, sections and untracked dir collapsed',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
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
        assert.equal(code,0)
        assert.match(io.text(),style.headerOf(r.dir,r.branch))
        assert.match(io.text(),style.headingOf,'unstaged')
        assert.match(io.text(),style.headingOf,'untracked')
        assert.match(io.text(),/\?\x20build\//,'untracked dir should collapse to one line')
        return assert.doesNotMatch(io.text(),/build\/deep\/x\.txt/,'nested file should not be listed')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('add: stages new files (the -A vs . behaviour) and reports them',function ()
{
    var io, r, staged

    r = newRepo()
    try
    {
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
        assert.match(staged,/new\.txt/,'git add . must stage a brand-new file')
        return assert.match(io.text(),/A\x20new\.txt/,'add should report what it staged')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('add: explicit paths are forwarded',function ()
{
    var io, r, staged

    r = newRepo()
    try
    {
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
        assert.match(staged,/a\.txt/)
        return assert.doesNotMatch(staged,/b\.txt/,'b.txt must remain unstaged')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('add: clean tree stays silent',function ()
{
    var io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        withCwd(r.dir,function ()
        {
            return add.add([],io,io.opts)
        })
        return assert.equal(io.text(),'')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: words become the message, new files included',function ()
{
    var code, files, io, r

    r = newRepo()
    try
    {
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
        assert.equal(code,0)
        assert.equal(r.git('log','-1','--pretty=%s').trim(),'fix the prompt')
        files = r.git('show','--name-only','--pretty=format:','HEAD')
        return assert.match(files,/brand\.txt/,'commit must include the new file, unlike git add -u')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: no words uses the hardcoded "misc" message',function ()
{
    var io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        fs.writeFileSync(path.join(r.dir,'a.txt'),'changed\n')
        io = sink()
        withCwd(r.dir,function ()
        {
            return commit.commit([],io,io.opts)
        })
        return assert.equal(r.git('log','-1','--pretty=%s').trim(),'misc')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('status: unaffected by the committed view — still says staged, uppercase',function ()
{
    var io, out, r

    r = newRepo()
    try
    {
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
        assert.match(out,style.headingOf('staged'),'kit status keeps the staged heading')
        assert.doesNotMatch(out,/committed/,'the commit view must not leak into kit status')
        return assert.match(out,/M\x20a\.txt/,'letters stay uppercase')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('add: unaffected by the committed view — still says staged, uppercase',function ()
{
    var io, out, r

    r = newRepo()
    try
    {
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
        assert.match(out,style.headingOf('staged'),'kit add keeps the staged heading')
        assert.doesNotMatch(out,/committed/,'the commit view must not leak into kit add')
        return assert.match(out,/M\x20a\.txt/,'letters stay uppercase')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: shows the state it is about to commit, labelled committed',function ()
{
    var io, out, r

    r = newRepo()
    try
    {
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
        assert.match(out,/committed/,'the pre-commit status render is intentional')
        assert.doesNotMatch(out,style.headingOf('staged'),'the staged heading is relabelled in the commit view')
        assert.match(out,/a\x20brand\.txt/,'a new file reads as lowercase a')
        return assert.match(out,/m\x20a\.txt/,'a modification reads as lowercase m')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: from a subdirectory, unstaged keeps uppercase letters',function ()
{
    var io, out, r

    r = newRepo()
    try
    {
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
        assert.match(out,style.headingOf('committed'),'the reachable change is committed')
        assert.match(out,/m\x20keep\.txt/,'lowercase under committed')
        assert.match(out,style.headingOf('unstaged'),'the unreachable change is not staged')
        return assert.match(out,/M\x20\.\.\/a\.txt/,'uppercase under unstaged: still git status there')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: nothing to commit exits 1 and stays silent on a clean tree',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        assert.equal(code,1)
        return assert.equal(io.text(),'','a clean tree produces no output at all')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: fully clean tree is silent',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','init')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],io,io.opts)
        })
        assert.equal(code,1)
        return assert.equal(io.text(),'')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('commit: no-op from a subdirectory is silent, not git prose',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
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
        assert.equal(code,1,'git still reports nothing to commit')
        assert.doesNotMatch(io.text(),/nothing\x20added\x20to\x20commit/)
        return assert.doesNotMatch(io.text(),/untracked\x20files\x20present/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('all commands: not a git repository exits 128',function ()
{
    var cases, code, dir, invoke, io, name, runAdd, runCommit, runLog, runStatus

    dir = fs.mkdtempSync(path.join(os.tmpdir(),'kit-norepo-'))
    try
    {
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
        var list = _k_.list(cases)
        for (var _a_ = 0; _a_ < list.length; _a_++)
        {
            name = list[_a_][0]
            invoke = list[_a_][1]
            io = sink()
            code = withCwd(dir,function ()
            {
                return invoke(io)
            })
            assert.equal(code,128,`${name} should exit 128 outside a repository`)
            assert.match(io.err.join('\n'),/not\x20a\x20git\x20repository/,`${name} should say why`)
        }
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(dir,{recursive:true,force:true})
    }
})

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
test('status: the header names the repository root, not the directory run in',function ()
{
    var code, io, r

    r = dirtyRepo()
    try
    {
        fs.mkdirSync(path.join(r.dir,'sub'))
        io = sink()
        code = withCwd(path.join(r.dir,'sub'),function ()
        {
            return status.status([],io,io.opts)
        })
        assert.equal(code,0)
        assert.match(io.text(),style.headerOf(r.dir,r.branch))
        return assert.match(io.text(),/M\x20\.\.\/a\.txt/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('status: a path argument reports that repository',function ()
{
    var io, r

    r = dirtyRepo()
    try
    {
        io = sink()
        assert.equal(status.status([r.dir],io,io.opts),0)
        assert.match(io.text(),style.headerOf(r.dir,r.branch))
        return assert.match(io.text(),/M\x20a\.txt/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('status: two paths give two reports, in the order given',function ()
{
    var forward, reverse, s

    s = twoSiblings()
    try
    {
        forward = sink()
        assert.equal(status.status([s.a.dir,s.b.dir],forward,forward.opts),0)
        assert.match(forward.text(),style.headerOf(s.a.dir,s.a.branch))
        assert.match(forward.text(),style.headerOf(s.b.dir,s.b.branch))
        assert.ok(forward.text().indexOf(s.a.dir) < forward.text().indexOf(s.b.dir),'reports follow the order of the arguments')
        reverse = sink()
        assert.equal(status.status([s.b.dir,s.a.dir],reverse,reverse.opts),0)
        return assert.ok(reverse.text().indexOf(s.b.dir) < reverse.text().indexOf(s.a.dir),'and reversing the arguments reverses the output')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(s.parent,{recursive:true,force:true})
    }
})
test('status: a path argument replaces the current directory, it is not added to it',function ()
{
    var code, io, s

    s = twoSiblings()
    try
    {
        io = sink()
        code = withCwd(s.a.dir,function ()
        {
            return status.status([s.b.dir],io,io.opts)
        })
        assert.equal(code,0)
        assert.match(io.text(),style.headerOf(s.b.dir,s.b.branch))
        return assert.ok(!io.text().includes(s.a.dir),'the shell directory is not reported')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(s.parent,{recursive:true,force:true})
    }
})
test('status: relative paths resolve against the directory kit started in',function ()
{
    var code, io, s

    s = twoSiblings()
    try
    {
        io = sink()
        code = withCwd(s.a.dir,function ()
        {
            return status.status(['.','../b'],io,io.opts)
        })
        assert.equal(code,0)
        assert.match(io.text(),style.headerOf(s.a.dir,s.a.branch),'. is this directory')
        return assert.match(io.text(),style.headerOf(s.b.dir,s.b.branch),'../b is the sibling of a')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(s.parent,{recursive:true,force:true})
    }
})
test('status: a relative path from a subdirectory climbs back out',function ()
{
    var code, io, s

    s = twoSiblings()
    try
    {
        fs.mkdirSync(path.join(s.a.dir,'sub'))
        io = sink()
        code = withCwd(path.join(s.a.dir,'sub'),function ()
        {
            return status.status(['../../b'],io,io.opts)
        })
        assert.equal(code,0)
        return assert.match(io.text(),style.headerOf(s.b.dir,s.b.branch))
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(s.parent,{recursive:true,force:true})
    }
})
test('status: a clean repository in the list contributes nothing',function ()
{
    var clean, dirty, io, parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-paths-'))
    try
    {
        dirty = dirtyRepo(path.join(parent,'dirty'))
        clean = newRepo(path.join(parent,'clean'))
        fs.writeFileSync(path.join(clean.dir,'a.txt'),'a\n')
        clean.git('add','-A')
        clean.git('commit','-qm','init')
        io = sink()
        assert.equal(status.status([clean.dir,dirty.dir],io,io.opts),0)
        assert.match(io.text(),style.headerOf(dirty.dir,dirty.branch))
        return assert.ok(!io.text().includes(clean.dir),'the clean repository is not mentioned')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(parent,{recursive:true,force:true})
    }
})
test('status: a path that is not a repository is named, and the rest still report',function ()
{
    var code, io, r, stranger

    r = dirtyRepo()
    stranger = fs.mkdtempSync(path.join(os.tmpdir(),'kit-stranger-'))
    try
    {
        io = sink()
        code = status.status([r.dir,stranger],io,io.opts)
        assert.equal(code,128,'git exits 128 for "not a repository"')
        assert.ok(io.err.join('\n').includes(stranger),'and says which path it was')
        assert.match(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        return assert.match(io.text(),style.headerOf(r.dir,r.branch),'one bad path does not lose the others')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        fs.rmSync(stranger,{recursive:true,force:true})
        return r.cleanup()
    }
})
test('status: a path that does not exist is reported as such, not as a bad repo',function ()
{
    var code, io, missing

    missing = path.join(os.tmpdir(),'kit-absent-42')
    io = sink()
    code = status.status([missing],io,io.opts)
    assert.equal(code,128)
    assert.ok(io.err.join('\n').includes(missing))
    assert.match(io.err.join('\n'),/no\x20such\x20directory/)
    assert.doesNotMatch(io.err.join('\n'),/not\x20a\x20git\x20repository/)
    return assert.equal(io.text(),'','and nothing is reported for it')
})
test('status: a bare repository and a .git directory are not work trees',function ()
{
    var bare, io, p, parent, repo

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-bare-'))
    try
    {
        bare = path.join(parent,'bare.git')
        fs.mkdirSync(bare)
        child_process.execFileSync('git',['init','-q','--bare','.'],{cwd:bare,stdio:'pipe'})
        repo = newRepo(path.join(parent,'repo'))
        var list = [bare,path.join(repo.dir,'.git')]
        for (var _b_ = 0; _b_ < list.length; _b_++)
        {
            p = list[_b_]
            io = sink()
            assert.equal(status.status([p],io,io.opts),128,`${p} is not a work tree`)
            assert.match(io.err.join('\n'),/no\x20work\x20tree/)
            assert.equal(io.text(),'')
        }
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(parent,{recursive:true,force:true})
    }
})

nest = function ()
{
    var parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-nest-'))
    return {parent:parent,a:dirtyRepo(path.join(parent,'a')),b:dirtyRepo(path.join(parent,'b'))}
}
test('status: a directory that is not a repository reports the ones one level down',function ()
{
    var io, n

    n = nest()
    try
    {
        io = sink()
        assert.equal(status.status([n.parent],io,io.opts),0)
        assert.match(io.text(),style.headerOf(n.a.dir,n.a.branch))
        assert.match(io.text(),style.headerOf(n.b.dir,n.b.branch))
        assert.ok(io.text().indexOf(n.a.dir) < io.text().indexOf(n.b.dir),'the repositories below are reported in name order')
        return assert.equal(io.err.length,0,'and the directory itself is not a problem')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('status: the shell directory is looked one level down too',function ()
{
    var io, n

    n = nest()
    try
    {
        io = sink()
        assert.equal(withCwd(n.parent,function ()
        {
            return status.status([],io,io.opts)
        }),0)
        assert.match(io.text(),style.headerOf(n.a.dir,n.a.branch))
        return assert.match(io.text(),style.headerOf(n.b.dir,n.b.branch))
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('status: a clean repository one level down contributes nothing',function ()
{
    var clean, io, n

    n = nest()
    try
    {
        clean = newRepo(path.join(n.parent,'clean'))
        fs.writeFileSync(path.join(clean.dir,'a.txt'),'a\n')
        clean.git('add','-A')
        clean.git('commit','-qm','init')
        io = sink()
        assert.equal(status.status([n.parent],io,io.opts),0,'silence is not an error')
        assert.match(io.text(),style.headerOf(n.a.dir,n.a.branch))
        return assert.ok(!io.text().includes(clean.dir),'the clean repository is not mentioned')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('status: a directory with no repository below it is still not a repository',function ()
{
    var io, parent

    parent = fs.mkdtempSync(path.join(os.tmpdir(),'kit-empty-'))
    try
    {
        io = sink()
        assert.equal(status.status([parent],io,io.opts),128)
        assert.match(io.err.join('\n'),/not\x20a\x20git\x20repository/)
        assert.ok(io.err.join('\n').includes(parent),'and it is named')
        return assert.equal(io.text(),'','and nothing is reported')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(parent,{recursive:true,force:true})
    }
})
test('status: a plain file below a directory is not a repository to report',function ()
{
    var io, n

    n = nest()
    try
    {
        fs.writeFileSync(path.join(n.parent,'a','notes.txt'),'x\n')
        io = sink()
        assert.equal(status.status([path.join(n.parent,'a','notes.txt')],io,io.opts),128)
        return assert.match(io.err.join('\n'),/not\x20a\x20git\x20repository/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('status: dot directories and plain directories one level down are skipped',function ()
{
    var io, n

    n = nest()
    try
    {
        fs.mkdirSync(path.join(n.parent,'.cache'))
        dirtyRepo(path.join(n.parent,'.cache','hidden'))
        fs.mkdirSync(path.join(n.parent,'notes'))
        io = sink()
        assert.equal(status.status([n.parent],io,io.opts),0)
        assert.match(io.text(),style.headerOf(n.a.dir,n.a.branch))
        assert.ok(!io.text().includes('hidden'),'nothing under a dot directory is reported')
        return assert.ok(!io.text().includes('notes'),'a directory that is not a repository is not reported')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('status: a repository reached through a symlink one level down is reported',function ()
{
    var io, n

    n = nest()
    try
    {
        fs.symlinkSync(n.a.dir,path.join(n.parent,'linked'),'dir')
        io = sink()
        assert.equal(status.status([n.parent],io,io.opts),0)
        return assert.match(io.text(),style.headerOf(n.a.dir,n.a.branch))
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('status: a repository that contains another repository reports only itself',function ()
{
    var inner, io, outer

    outer = dirtyRepo()
    try
    {
        inner = dirtyRepo(path.join(outer.dir,'inner'))
        io = sink()
        assert.equal(status.status([outer.dir],io,io.opts),0)
        assert.match(io.text(),style.headerOf(outer.dir,outer.branch))
        return assert.doesNotMatch(io.text(),style.headerOf(inner.dir,inner.branch))
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return outer.cleanup()
    }
})
test('status: one bad path among repositories that are looked into still exits 128',function ()
{
    var io, n, stranger

    n = nest()
    stranger = fs.mkdtempSync(path.join(os.tmpdir(),'kit-stranger-'))
    try
    {
        io = sink()
        assert.equal(status.status([n.parent,stranger],io,io.opts),128)
        assert.match(io.text(),style.headerOf(n.a.dir,n.a.branch))
        return assert.match(io.err.join('\n'),/not\x20a\x20git\x20repository/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        fs.rmSync(stranger,{recursive:true,force:true})
        return fs.rmSync(n.parent,{recursive:true,force:true})
    }
})
test('add and commit: the header names the repository root too',function ()
{
    var added, committed, r

    r = dirtyRepo()
    try
    {
        added = sink()
        withCwd(r.dir,function ()
        {
            return add.add([],added,added.opts)
        })
        assert.match(added.text(),style.headerOf(r.dir,r.branch))
        fs.writeFileSync(path.join(r.dir,'b.txt'),'b\n')
        committed = sink()
        withCwd(r.dir,function ()
        {
            return commit.commit(['msg'],committed,committed.opts)
        })
        assert.match(committed.text(),style.headerOf(r.dir,r.branch))
        return assert.match(committed.text(),style.headingOf,'committed')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})

repoWithCommits = function (n)
{
    var i, r

    r = newRepo()
    for (var _c_ = i = 1, _d_ = n + 1; (_c_ <= _d_ ? i < n + 1 : i > n + 1); (_c_ <= _d_ ? ++i : --i))
    {
        fs.writeFileSync(path.join(r.dir,`f${i}.txt`),`${i}\n`)
        r.git('add','-A')
        r.git('commit','-qm',`commit ${i}`)
    }
    return r
}
test('log: empty history is silent and exits 0',function ()
{
    var code, io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        assert.equal(code,0)
        return assert.equal(io.text(),'','a repo with no commits prints nothing')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: lists every commit, oldest first',function ()
{
    var io, lines, r

    r = repoWithCommits(3)
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        lines = io.text().split('\n')
        assert.equal(lines.length,3)
        assert.match(lines[0],/commit\x201$/,'oldest first')
        return assert.match(lines[2],/commit\x203$/,'newest last')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: a bare number limits to that many commits',function ()
{
    var io, lines, older, r

    r = repoWithCommits(5)
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['2'],io,io.opts)
        })
        lines = io.text().split('\n')
        assert.equal(lines.length,2,'a commit count, not a line count')
        assert.match(lines[0],/commit\x204$/,'the older of the two most recent')
        assert.match(lines[1],/commit\x205$/,'the newest is last')
        older = lines.filter(function (l)
        {
            return (/commit\x20[123]$/).test(l)
        })
        return assert.equal(older.length,0,'nothing older is shown')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: zero is silent',function ()
{
    var code, io, r

    r = repoWithCommits(3)
    try
    {
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['0'],io,io.opts)
        })
        assert.equal(code,0)
        return assert.equal(io.text(),'')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: shows a short hash and never a full 40-character one',function ()
{
    var full, io, line, r

    r = repoWithCommits(1)
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        line = io.text()
        full = r.git('rev-parse','HEAD').trim()
        assert.ok(line.includes(full.slice(0,7)),'the short hash is present')
        return assert.ok(!line.includes(full),'the full hash is not')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: shows the author name without the email address',function ()
{
    var env, io, line, r

    r = newRepo()
    try
    {
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
        assert.match(line,/Thorsten/,'the author name appears')
        return assert.ok(!line.includes('t@e.st'),'the email address does not')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: date is the short absolute form without seconds',function ()
{
    var env, hours, io, local, r, want

    r = newRepo()
    try
    {
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
        assert.ok(io.text().includes(want),`date should read \"${want}\", got: ${io.text()}`)
        assert.ok(!(/03:04:\d\d/).test(io.text()),'seconds are not shown')
        return assert.ok(!(/2020/).test(io.text()),'the year is not shown')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})

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
test('log: a date the line above already gave is blanked to spaces',function ()
{
    var dates, io, r

    r = datedRepo()
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,Object.assign({},io.opts,{width:200}))
        })
        dates = io.text().split('\n').map(dateOf)
        assert.equal(dates[0],FIRST,'the first line carries the date in full')
        assert.equal(dates[1],blanked(SECOND),'the second is the same day, so only its time is left')
        return assert.equal(dates[2],THIRD,'a new month is written out in full')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: -l writes the date on every line, blanked or not',function ()
{
    var io, r

    r = datedRepo()
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l'],io,Object.assign({},io.opts,{width:200}))
        })
        return assert.deepEqual(io.text().split('\n').map(dateOf),[FIRST,SECOND,THIRD])
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: a non-numeric argument errors instead of printing everything',function ()
{
    var code, io, r

    r = repoWithCommits(3)
    try
    {
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['foo'],io,io.opts)
        })
        assert.equal(code,1)
        assert.equal(io.text(),'','no history is printed')
        return assert.match(io.err.join('\n'),/not\x20a\x20commit\x20count/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: -l shows the commit body, which short mode hides',function ()
{
    var long, r, short

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        fs.writeFileSync(path.join(r.dir,'msg.txt'),'the subject line\n\nA body paragraph that only --long shows.\n\nAnd a second one.')
        r.git('commit','-q','-F','msg.txt')
        short = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],short,Object.assign({},short.opts,{width:200}))
        })
        assert.match(short.text(),/the\x20subject\x20line/)
        assert.ok(!short.text().includes('A body paragraph'),'short mode hides the body')
        long = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l'],long,Object.assign({},long.opts,{width:200}))
        })
        assert.match(long.text(),/A\x20body\x20paragraph/,'-l shows the body')
        return assert.match(long.text(),/And\x20a\x20second\x20one\./)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: -l and --long are equivalent',function ()
{
    var a, b, r

    r = repoWithCommits(2)
    try
    {
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
        return assert.equal(a.text(),b.text())
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: -l with a count returns exactly that many commits',function ()
{
    var hashes, io, r, _1137_55_

    r = repoWithCommits(5)
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l','2'],io,Object.assign({},io.opts,{width:100}))
        })
        hashes = ((_1137_55_=io.text().match(/^[0-9a-f]{7}\x20/gm)) != null ? _1137_55_ : [])
        return assert.equal(hashes.length,2,'a commit count, not a line count')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: -l 0 is silent',function ()
{
    var code, io, r

    r = repoWithCommits(3)
    try
    {
        io = sink()
        code = withCwd(r.dir,function ()
        {
            return log.log(['-l','0'],io,Object.assign({},io.opts,{width:100}))
        })
        assert.equal(code,0)
        return assert.equal(io.text(),'')
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: output respects the terminal width it is given',function ()
{
    var io, len, line, r

    r = repoWithCommits(1)
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,Object.assign({},io.opts,{width:80}))
        })
        line = io.text().replace(/\u001b\[[0-9;]*m/g,'')
        len = Array.from(line).length
        return assert.ok(len <= 80,`line of ${len} must fit 80`)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})
test('log: a subject with spaces and colons is preserved',function ()
{
    var io, r

    r = newRepo()
    try
    {
        fs.writeFileSync(path.join(r.dir,'a.txt'),'a\n')
        r.git('add','-A')
        r.git('commit','-qm','fix: handle empty tree and  spaces')
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log([],io,io.opts)
        })
        return assert.match(io.text(),/fix:\x20handle\x20empty\x20tree\x20and\x20{2}spaces$/)
    }
    catch (err)
    {
        throw err
    }
    finally
    {
        return r.cleanup()
    }
})

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyYXRpb24udGVzdC5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2ludGVncmF0aW9uLnRlc3Qua29kZSJdLCJtYXBwaW5ncyI6Ijs7OztPQVlPLEtBQUssS0FBSztPQUNWLE9BQU8sS0FBSzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFTbkI7Ozs7SUFFSSxNQUFNLFVBQVM7SUFDZixNQUFTLE1BQVMsR0FBRyxZQUFZLEtBQUssS0FBSyxHQUFHLFNBQVUsZ0JBQW1CO1NBQ3BFOztRQUFTLEdBQUcsVUFBVSxLQUFNLFVBQVc7O0lBRTlDLE1BQU0sT0FBTyxVQUFXLFFBQVEsS0FDNUIsZ0JBQWlCLE9BQ2pCLGlCQUFrQixTQUNsQixtQkFBb0IsT0FDcEIsb0JBQXFCO0lBR3pCOztlQUNJLGNBQWMsYUFBYSxPQUFRLEtBQUssb0JBQW9CLEtBQUssa0JBQWtCLE9BQU8sT0FDdEYsSUFBSyxJQUNMLFNBQVUsT0FDVixJQUFLOztJQUdiLElBQUksT0FBUTtJQUVaLFNBQVMsSUFBSSxlQUFnQixVQUFXLFFBQVE7SUFDaEQsT0FBTyxHQUFHLE9BQVE7UUFFZjs7UUFBUzs7bUJBQWEsR0FBRyxPQUFPLEtBQU0sVUFBVyxLQUFNLE1BQU87Ozs7O1FBQzVEOzs7WUFFTCxJQUFLLElBQ0wsSUFBSyxJQUNMLElBQUssSUFDTCxPQUFRLE9BQ1IsUUFBUzs7O0FBRWI7Ozs7SUFFSTtJQUNBO0lBRUE7O2VBQWEsSUFBSSxLQUFLOztJQUN0Qjs7ZUFBZSxJQUFJLEtBQUs7O0lBQ3hCOztlQUFVLElBQUksS0FBSzs7WUFFbkIsSUFBSyxJQUNMLElBQUssSUFDTCxJQUFLLElBQ0wsTUFBTyxNQUNQLEtBQU0sS0FDTixNQUFPLE1BQU8sTUFBTTs7O0FBRXhCOzs7O0lBRUksT0FBTyxRQUFRO0lBQ2YsUUFBUSxNQUFNOzs7ZUFHUjs7V0FDQTs7UUFDRixNQUFNOzs7O2VBRU4sUUFBUSxNQUFNOzs7O0FBRXRCOzs7O0lBRUksU0FBUyxHQUFHLFlBQVksS0FBSyxLQUFLLEdBQUcsU0FB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
//# sourceURL=file:///home/kodi/s/kit/kode/test/integration.test.kode
