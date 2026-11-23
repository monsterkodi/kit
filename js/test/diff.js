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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2RpZmYua29kZSJdLCJtYXBwaW5ncyI6Ijs7O09BYU8sV0FBQTs7T0FDRCxjQUFBO0lBQVU7SUFBUTs7O0FBRXhCOztXQUFXOzs7QUFDWDs7V0FBWTs7O0FBQ1oscUJBQVk7O1dBQVUsVUFBUzs7Ozs7O1FBTXZCLElBQUksS0FBSztRQUVKLFFBQUwsRUFBRSxHQUFLO1FBQ0UsUUFBVCxFQUFFLE9BQVM7UUFDSCxRQUFSLEVBQUU7Ozs7UUFJRixJQUFJLEtBQUssV0FBVyxNQUFPO1FBRXRCLFFBQUwsRUFBRSxHQUFLO1FBQ1MsUUFBaEIsRUFBRSxPQUFPLE9BQVM7UUFDVixRQUFSLEVBQUU7UUFFRixJQUFJLEtBQUssV0FBVyxPQUFRO1FBRVosUUFBaEIsRUFBRSxPQUFPLE9BQVM7Ozs7UUFJbEIsSUFBSSxLQUFLLFdBQVcsTUFBTztRQUV0QixRQUFMLEVBQUUsR0FBSztRQUNQLFFBQVEsRUFBRSxRQUFTOzs7O1FBSW5CLElBQUksS0FBSyxXQUFXLFdBQVk7UUFFM0IsUUFBTCxFQUFFLEdBQUs7UUFDTSxRQUFiLEVBQUUsT0FBTyxJQUFNO1FBRWYsSUFBSSxLQUFLLFdBQVcsUUFBUztRQUVoQixRQUFiLEVBQUUsT0FBTyxJQUFNOzs7O1FBSWYsSUFBSSxLQUFLLFdBQVcsb0JBQXFCO1FBRXBDLFFBQUwsRUFBRSxHQUFLO1FBQ0UsUUFBVCxFQUFFLE9BQVM7UUFDSCxRQUFSLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLFFBQVM7UUFFcEIsUUFBVCxFQUFFLE9BQVM7UUFDSCxRQUFSLEVBQUUsT0FBUztRQUVYLElBQUksS0FBSyxXQUFXLFNBQVU7UUFFckIsUUFBVCxFQUFFLE9BQVM7UUFDSCxRQUFSLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLE1BQU87UUFFbkIsUUFBUixFQUFFLE9BQVM7UUFFWCxJQUFJLEtBQUssV0FBVyxPQUFRO1FBRXBCLFFBQVIsRUFBRSxPQUFTO1FBRVgsSUFBSSxLQUFLLFdBQVcsT0FBUSxLQUFNLE1BQU87UUFFakMsUUFBUixFQUFFLE9BQVMsT0FBUSxLQUFNO1FBRXpCLElBQUksS0FBSyxXQUFXLFFBQVMsTUFBTyxPQUFRO1FBRXBDLFFBQVIsRUFBRSxPQUFTLFNBQVUsT0FBUTs7OztRQUk3QixJQUFJLEtBQUssV0FBVyxjQUFlO1FBRTNCLFFBQVIsRUFBRSxPQUFTOzs7O1FBSVgsSUFBSSxLQUFLLFdBQVcsUUFBUyxjQUFlO1FBRXBDLFFBQVIsRUFBRSxPQUFTLFNBQVU7Ozs7UUFJckIsSUFBSSxLQUFLLFdBQVcsS0FBTSxRQUFTO1FBRTlCLFFBQUwsRUFBRSxHQUFLO1FBQ1MsUUFBaEIsRUFBRSxPQUFPLE9BQVM7UUFDVixRQUFSLEVBQUUsT0FBUztRQUVYLElBQUksS0FBSyxXQUFXLE9BQVEsb0JBQXFCO1FBRXBDLFFBQWIsRUFBRSxPQUFPLElBQU07UUFDUCxRQUFSLEVBQUUsT0FBUzs7OztRQUlYLElBQUksS0FBSyxXQUFXLEtBQU0sTUFBTztRQUU1QixRQUFMLEVBQUUsR0FBSztRQUNQLFFBQVEsRUFBRSxRQUFTO1FBRW5CLElBQUksS0FBSyxXQUFXLEtBQU0sUUFBUztRQUU5QixRQUFMLEVBQUUsR0FBSztRQUNQLFFBQVEsRUFBRSxRQUFTOzs7O1FBSW5CLElBQUksS0FBSyxXQUFXLFVBQVc7UUFFMUIsUUFBTCxFQUFFLEdBQUs7UUFDUCxRQUFRLEVBQUUsUUFBUzs7Ozs7Ozs7UUFNUSxRQUEzQixLQUFLLFlBQVksV0FBYyxPQUFRLGFBQWM7Ozs7UUFJcEIsUUFBakMsS0FBSyxZQUFZLE1BQU8sV0FBYSxPQUFRLFdBQVksS0FBTSxTQUFVLE9BQVEsS0FBTTs7OztRQUl2RCxRQUFoQyxLQUFLLFlBQVksZ0JBQW1CLE9BQVE7Ozs7UUFJSixRQUF4QyxLQUFLLFlBQVksV0FBWSxhQUFlLE9BQVEsVUFBVyxLQUFNOzs7Ozs7OztRQU1qQyxRQUFwQyxLQUFLLGVBQWUsTUFBTyxXQUFhLE9BQVEsV0FBWSxjQUFlLEtBQU0sU0FBVSxPQUFRLGNBQWUsS0FBTTs7OztRQUk3RSxRQUEzQyxLQUFLLGVBQWUsV0FBWSxhQUFlLE9BQVEsWUFBYSxjQUFlLFVBQVcsS0FBTSJ9
//# sourceURL=../../kode/test/diff.kode
