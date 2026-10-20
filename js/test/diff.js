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
        compare(r.target.number,1)
        compare(r.paths,[])
        r = diff.parseArgs(['-13'],never)
        compare(r.target.number,13)
    })
    await section("zero is not a commit count", async function ()
    {
        r = diff.parseArgs(['-0'],never)
        compare(r.ok,false)
        matches(r.message,/not\x20a\x20commit\x20count/)
    })
    await section("a ref or a hash is a commit", async function ()
    {
        r = diff.parseArgs(['abc1234'],always)
        compare(r.ok,true)
        compare(r.target.rev,'abc1234')
        r = diff.parseArgs(['main'],always)
        compare(r.target.rev,'main')
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
    await section("any file type is a filter, and a set of them is a set of paths", async function ()
    {
        r = diff.parseArgs(['js'],never)
        compare(r.paths,['js'])
        r = diff.parseArgs(['.js'],never)
        compare(r.paths,['*.js'])
        r = diff.parseArgs(['kode','js','sh'],never)
        compare(r.paths,['kode','js','sh'])
        r = diff.parseArgs(['.kode','.js','.sh'],never)
        compare(r.paths,['*.kode','*.js','*.sh'])
    })
    await section("a path is a path, not a type", async function ()
    {
        r = diff.parseArgs(['js/diff.js'],never)
        compare(r.paths,['js/diff.js'])
    })
    await section("a type and a path can be asked for together", async function ()
    {
        r = diff.parseArgs(['.kode','js/diff.js'],never)
        compare(r.paths,['*.kode','js/diff.js'])
    })
    await section("a commit and a path mix", async function ()
    {
        r = diff.parseArgs(['-1','kode'],never)
        compare(r.ok,true)
        compare(r.target.number,1)
        compare(r.paths,['kode'])
        r = diff.parseArgs(['main','kode/render.kode'],mainOnly)
        compare(r.target.rev,'main')
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
        compare(diff.gitCommands('abc1234',[]),[['show','abc1234']])
    })
    await section("a commit with paths shows those paths alone", async function ()
    {
        compare(diff.gitCommands('abc1234',['*.kode']),[['show','abc1234','--','*.kode']])
    })
}
toExport["gitCommands"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2RpZmYua29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQWdCQTs7V0FBVzs7O0FBQ1g7O1dBQVk7OztBQUNaOztXQUFzQixVQUFTOzs7Ozs7UUFNdkIsSUFBSSxLQUFLO2dCQUVULEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQVM7Z0JBQ1gsRUFBRTs7OztRQUlGLElBQUksS0FBSyxXQUFXLE1BQU87Z0JBRTNCLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQU8sT0FBUztnQkFDbEIsRUFBRTtRQUVGLElBQUksS0FBSyxXQUFXLE9BQVE7Z0JBRTVCLEVBQUUsT0FBTyxPQUFTOzs7O1FBSWxCLElBQUksS0FBSyxXQUFXLE1BQU87Z0JBRTNCLEVBQUUsR0FBSztRQUNQLFFBQVEsRUFBRSxRQUFTOzs7O1FBSW5CLElBQUksS0FBSyxXQUFXLFdBQVk7Z0JBRWhDLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQU8sSUFBTTtRQUVmLElBQUksS0FBSyxXQUFXLFFBQVM7Z0JBRTdCLEVBQUUsT0FBTyxJQUFNOzs7O1FBSWYsSUFBSSxLQUFLLFdBQVcsb0JBQXFCO2dCQUV6QyxFQUFFLEdBQUs7Z0JBQ1AsRUFBRSxPQUFTO2dCQUNYLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLFFBQVM7Z0JBRTdCLEVBQUUsT0FBUztnQkFDWCxFQUFFLE9BQVM7UUFFWCxJQUFJLEtBQUssV0FBVyxTQUFVO2dCQUU5QixFQUFFLE9BQVM7Z0JBQ1gsRUFBRSxPQUFTOzs7O1FBSVgsSUFBSSxLQUFLLFdBQVcsTUFBTztnQkFFM0IsRUFBRSxPQUFTO1FBRVgsSUFBSSxLQUFLLFdBQVcsT0FBUTtnQkFFNUIsRUFBRSxPQUFTO1FBRVgsSUFBSSxLQUFLLFdBQVcsT0FBUSxLQUFNLE1BQU87Z0JBRXpDLEVBQUUsT0FBUyxPQUFRLEtBQU07UUFFekIsSUFBSSxLQUFLLFdBQVcsUUFBUyxNQUFPLE9BQVE7Z0JBRTVDLEVBQUUsT0FBUyxTQUFVLE9BQVE7Ozs7UUFJN0IsSUFBSSxLQUFLLFdBQVcsY0FBZTtnQkFFbkMsRUFBRSxPQUFTOzs7O1FBSVgsSUFBSSxLQUFLLFdBQVcsUUFBUyxjQUFlO2dCQUU1QyxFQUFFLE9BQVMsU0FBVTs7OztRQUlyQixJQUFJLEtBQUssV0FBVyxLQUFNLFFBQVM7Z0JBRW5DLEVBQUUsR0FBSztnQkFDUCxFQUFFLE9BQU8sT0FBUztnQkFDbEIsRUFBRSxPQUFTO1FBRVgsSUFBSSxLQUFLLFdBQVcsT0FBUSxvQkFBcUI7Z0JBRWpELEVBQUUsT0FBTyxJQUFNO2dCQUNmLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLEtBQU0sTUFBTztnQkFFakMsRUFBRSxHQUFLO1FBQ1AsUUFBUSxFQUFFLFFBQVM7UUFFbkIsSUFBSSxLQUFLLFdBQVcsS0FBTSxRQUFTO2dCQUVuQyxFQUFFLEdBQUs7UUFDUCxRQUFRLEVBQUUsUUFBUzs7OztRQUluQixJQUFJLEtBQUssV0FBVyxVQUFXO2dCQUUvQixFQUFFLEdBQUs7UUFDUCxRQUFRLEVBQUUsUUFBUzs7Ozs7Ozs7Z0JBTW5CLEtBQUssWUFBWSxXQUFjLE9BQVEsYUFBYzs7OztnQkFJckQsS0FBSyxZQUFZLE1BQU8sV0FBYSxPQUFRLFdBQVksS0FBTSxTQUFVLE9BQVEsS0FBTTs7OztnQkFJdkYsS0FBSyxZQUFZLGdCQUFtQixPQUFROzs7O2dCQUk1QyxLQUFLLFlBQVksV0FBWSxhQUFlLE9BQVEsVUFBVyxLQUFNIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/test/diff.kode
