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
toExport["changeCommands"] = async function ()
{
    await section("the working tree lists the staged and the unstaged files", async function ()
    {
        compare(diff.changeCommands(null,['kode']),[['diff','--staged','--name-only','--','kode'],['diff','--name-only','--','kode']])
    })
    await section("a commit lists its files without the header", async function ()
    {
        compare(diff.changeCommands('abc1234',['*.kode']),[['show','--format=','--name-only','abc1234','--','*.kode']])
    })
}
toExport["changeCommands"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2RpZmYua29kZSJdLCJtYXBwaW5ncyI6Ijs7O09BYU8sV0FBQTs7T0FDRCxjQUFBO0lBQVU7SUFBUTs7O0FBRXhCOztXQUFXOzs7QUFDWDs7V0FBWTs7O0FBQ1oscUJBQVk7O1dBQVUsVUFBUzs7Ozs7O1FBTXZCLElBQUksS0FBSztnQkFFVCxFQUFFLEdBQUs7Z0JBQ1AsRUFBRSxPQUFTO2dCQUNYLEVBQUU7Ozs7UUFJRixJQUFJLEtBQUssV0FBVyxNQUFPO2dCQUUzQixFQUFFLEdBQUs7Z0JBQ1AsRUFBRSxPQUFPLE9BQVM7Z0JBQ2xCLEVBQUU7UUFFRixJQUFJLEtBQUssV0FBVyxPQUFRO2dCQUU1QixFQUFFLE9BQU8sT0FBUzs7OztRQUlsQixJQUFJLEtBQUssV0FBVyxNQUFPO2dCQUUzQixFQUFFLEdBQUs7UUFDUCxRQUFRLEVBQUUsUUFBUzs7OztRQUluQixJQUFJLEtBQUssV0FBVyxXQUFZO2dCQUVoQyxFQUFFLEdBQUs7Z0JBQ1AsRUFBRSxPQUFPLElBQU07UUFFZixJQUFJLEtBQUssV0FBVyxRQUFTO2dCQUU3QixFQUFFLE9BQU8sSUFBTTs7OztRQUlmLElBQUksS0FBSyxXQUFXLG9CQUFxQjtnQkFFekMsRUFBRSxHQUFLO2dCQUNQLEVBQUUsT0FBUztnQkFDWCxFQUFFLE9BQVM7Ozs7UUFJWCxJQUFJLEtBQUssV0FBVyxRQUFTO2dCQUU3QixFQUFFLE9BQVM7Z0JBQ1gsRUFBRSxPQUFTO1FBRVgsSUFBSSxLQUFLLFdBQVcsU0FBVTtnQkFFOUIsRUFBRSxPQUFTO2dCQUNYLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLE1BQU87Z0JBRTNCLEVBQUUsT0FBUztRQUVYLElBQUksS0FBSyxXQUFXLE9BQVE7Z0JBRTVCLEVBQUUsT0FBUztRQUVYLElBQUksS0FBSyxXQUFXLE9BQVEsS0FBTSxNQUFPO2dCQUV6QyxFQUFFLE9BQVMsT0FBUSxLQUFNO1FBRXpCLElBQUksS0FBSyxXQUFXLFFBQVMsTUFBTyxPQUFRO2dCQUU1QyxFQUFFLE9BQVMsU0FBVSxPQUFROzs7O1FBSTdCLElBQUksS0FBSyxXQUFXLGNBQWU7Z0JBRW5DLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLFFBQVMsY0FBZTtnQkFFNUMsRUFBRSxPQUFTLFNBQVU7Ozs7UUFJckIsSUFBSSxLQUFLLFdBQVcsS0FBTSxRQUFTO2dCQUVuQyxFQUFFLEdBQUs7Z0JBQ1AsRUFBRSxPQUFPLE9BQVM7Z0JBQ2xCLEVBQUUsT0FBUztRQUVYLElBQUksS0FBSyxXQUFXLE9BQVEsb0JBQXFCO2dCQUVqRCxFQUFFLE9BQU8sSUFBTTtnQkFDZixFQUFFLE9BQVM7Ozs7UUFJWCxJQUFJLEtBQUssV0FBVyxLQUFNLE1BQU87Z0JBRWpDLEVBQUUsR0FBSztRQUNQLFFBQVEsRUFBRSxRQUFTO1FBRW5CLElBQUksS0FBSyxXQUFXLEtBQU0sUUFBUztnQkFFbkMsRUFBRSxHQUFLO1FBQ1AsUUFBUSxFQUFFLFFBQVM7Ozs7UUFJbkIsSUFBSSxLQUFLLFdBQVcsVUFBVztnQkFFL0IsRUFBRSxHQUFLO1FBQ1AsUUFBUSxFQUFFLFFBQVM7Ozs7Ozs7O2dCQU1uQixLQUFLLFlBQVksV0FBYyxPQUFRLGFBQWM7Ozs7Z0JBSXJELEtBQUssWUFBWSxNQUFPLFdBQWEsT0FBUSxXQUFZLEtBQU0sU0FBVSxPQUFRLEtBQU07Ozs7Z0JBSXZGLEtBQUssWUFBWSxnQkFBbUIsT0FBUTs7OztnQkFJNUMsS0FBSyxZQUFZLFdBQVksYUFBZSxPQUFRLFVBQVcsS0FBTTs7Ozs7Ozs7Z0JBTXJFLEtBQUssZUFBZSxNQUFPLFdBQWEsT0FBUSxXQUFZLGNBQWUsS0FBTSxTQUFVLE9BQVEsY0FBZSxLQUFNOzs7O2dCQUl4SCxLQUFLLGVBQWUsV0FBWSxhQUFlLE9BQVEsWUFBYSxjQUFlLFVBQVcsS0FBTSJ9
//# sourceURL=../../kode/test/diff.kode
