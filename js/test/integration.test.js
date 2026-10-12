var _k_ = {list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var blanked, datedRepo, dateOf, dirtyRepo, FIRST, localDate, nest, newRepo, repoWithCommits, SECOND, sink, THIRD, twoSiblings, withCwd, withRemote

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import cp from 'node:child_process'
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
        return cp.execFileSync('git',['-c','user.email=t@e.st','-c','user.name=test'].concat(args),{cwd:dir,encoding:'utf8',env:env})
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
    cp.execFileSync('git',['init','-q','--bare','.'],{cwd:origin,stdio:'pipe'})
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
        cp.execFileSync('git',['clone','-q',origin,dir],{encoding:'utf8',env:local.env})
        git = function (...args)
        {
            return cp.execFileSync('git',['-c','user.email=t@e.st','-c','user.name=test'].concat(args),{cwd:dir,encoding:'utf8',env:local.env})
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
        cp.execFileSync('git',['init','-q','--bare','.'],{cwd:bare,stdio:'pipe'})
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
        cp.execFileSync('git',['commit','-qm','authored'],{cwd:r.dir,encoding:'utf8',env:env})
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
        cp.execFileSync('git',['commit','-qm','dated'],{cwd:r.dir,encoding:'utf8',env:env})
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
        return cp.execFileSync('git',['commit','-qm',msg],{cwd:r.dir,encoding:'utf8',env:env})
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
    var hashes, io, r, _1209_55_

    r = repoWithCommits(5)
    try
    {
        io = sink()
        withCwd(r.dir,function ()
        {
            return log.log(['-l','2'],io,Object.assign({},io.opts,{width:100}))
        })
        hashes = ((_1209_55_=io.text().match(/^[0-9a-f]{7}\x20/gm)) != null ? _1209_55_ : [])
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