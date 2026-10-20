var toExport = {}
var always, mainOnly, never, r

import diff from "../diff.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches


never = function ()
{
    return false
}

always = function ()
{
    return true
}

mainOnly = function (token)
{
    return token === 'main'
}
toExport["parseArgs"] = async function ()
{
    await section("no arguments means the working tree", async function ()
    {
        r = diff.parseArgs([])
        compare(r.ok,true)
        compare(r.target,null)
        compare(r.paths,[])
    })
    await section("a negative number is a commit", async function ()
    {
        r = diff.parseArgs(['-1'],never)
        compare(r.ok,true)
        compare(r.target,'-1')
        compare(r.paths,[])
    })
    await section("a ref or a hash is a commit", async function ()
    {
        r = diff.parseArgs(['abc1234'],always)
        compare(r.ok,true)
        compare(r.target,'abc1234')
        r = diff.parseArgs(['main'],always)
        compare(r.target,'main')
    })
    await section("a token that is no commit is a path", async function ()
    {
        r = diff.parseArgs(['kode/render.kode'],never)
        compare(r.ok,true)
        compare(r.target,null)
        compare(r.paths,['kode/render.kode'])
    })
    await section("kode and .kode are the two known filters", async function ()
    {
        r = diff.parseArgs(['kode'],never)
        compare(r.target,null)
        compare(r.paths,['kode'])
        r = diff.parseArgs(['.kode'],never)
        compare(r.target,null)
        compare(r.paths,['*.kode'])
    })
    await section("a commit and a path mix", async function ()
    {
        r = diff.parseArgs(['-1','kode'],never)
        compare(r.ok,true)
        compare(r.target,'-1')
        compare(r.paths,['kode'])
        r = diff.parseArgs(['main','kode/render.kode'],mainOnly)
        compare(r.target,'main')
        compare(r.paths,['kode/render.kode'])
    })
    await section("two commits are an error", async function ()
    {
        r = diff.parseArgs(['-1','-2'],never)
        compare(r.ok,false)
        matches(r.message,/at\x20most\x20one/)
        r = diff.parseArgs(['-1','main'],always)
        compare(r.ok,false)
        matches(r.message,/at\x20most\x20one/)
    })
    await section("an unknown flag is an error, not a file name", async function ()
    {
        r = diff.parseArgs(['--stat'],never)
        compare(r.ok,false)
        matches(r.message,/not\x20a\x20commit\x20number/)
    })
}
toExport["parseArgs"]._section_ = true
toExport["gitCommands"] = async function ()
{
    await section("the working tree is the staged diff and then the unstaged one", async function ()
    {
        compare(diff.gitCommands(null,[]),[['diff','--staged'],['diff']])
    })
    await section("paths narrow both of them down", async function ()
    {
        compare(diff.gitCommands(null,['kode']),[['diff','--staged','--','kode'],['diff','--','kode']])
    })
    await section("a commit is shown with git show", async function ()
    {
        compare(diff.gitCommands('-1',[]),[['show','-1']])
    })
    await section("a commit with paths shows those paths alone", async function ()
    {
        compare(diff.gitCommands('abc1234',['*.kode']),[['show','abc1234','--','*.kode']])
    })
}
toExport["gitCommands"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2RpZmYua29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQWdCQTs7V0FBVzs7O0FBQ1g7O1dBQVk7OztBQUNaOztXQUFzQixVQUFTOzs7Ozs7UUFNdkIsSUFBSSxLQUFLO2dCQUVULEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQVM7Z0JBQ1gsRUFBRTs7OztRQUlGLElBQUksS0FBSyxXQUFXLE1BQU87Z0JBRTNCLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQVM7Z0JBQ1gsRUFBRTs7OztRQUlGLElBQUksS0FBSyxXQUFXLFdBQVk7Z0JBRWhDLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQVM7UUFFWCxJQUFJLEtBQUssV0FBVyxRQUFTO2dCQUU3QixFQUFFLE9BQVM7Ozs7UUFJWCxJQUFJLEtBQUssV0FBVyxvQkFBcUI7Z0JBRXpDLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQVM7Z0JBQ1gsRUFBRSxPQUFTOzs7O1FBSVgsSUFBSSxLQUFLLFdBQVcsUUFBUztnQkFFN0IsRUFBRSxPQUFTO2dCQUNYLEVBQUUsT0FBUztRQUVYLElBQUksS0FBSyxXQUFXLFNBQVU7Z0JBRTlCLEVBQUUsT0FBUztnQkFDWCxFQUFFLE9BQVM7Ozs7UUFJWCxJQUFJLEtBQUssV0FBVyxLQUFNLFFBQVM7Z0JBRW5DLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQVM7Z0JBQ1gsRUFBRSxPQUFTO1FBRVgsSUFBSSxLQUFLLFdBQVcsT0FBUSxvQkFBcUI7Z0JBRWpELEVBQUUsT0FBUztnQkFDWCxFQUFFLE9BQVM7Ozs7UUFJWCxJQUFJLEtBQUssV0FBVyxLQUFNLE1BQU87Z0JBRWpDLEVBQUUsR0FBSztRQUNQLFFBQVEsRUFBRSxRQUFTO1FBRW5CLElBQUksS0FBSyxXQUFXLEtBQU0sUUFBUztnQkFFbkMsRUFBRSxHQUFLO1FBQ1AsUUFBUSxFQUFFLFFBQVM7Ozs7UUFJbkIsSUFBSSxLQUFLLFdBQVcsVUFBVztnQkFFL0IsRUFBRSxHQUFLO1FBQ1AsUUFBUSxFQUFFLFFBQVM7Ozs7Ozs7O2dCQU1uQixLQUFLLFlBQVksV0FBYyxPQUFRLGFBQWM7Ozs7Z0JBSXJELEtBQUssWUFBWSxNQUFPLFdBQWEsT0FBUSxXQUFZLEtBQU0sU0FBVSxPQUFRLEtBQU07Ozs7Z0JBSXZGLEtBQUssWUFBWSxXQUFjLE9BQVE7Ozs7Z0JBSXZDLEtBQUssWUFBWSxXQUFZLGFBQWUsT0FBUSxVQUFXLEtBQU0ifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/test/diff.kode
