var toExport = {}
var data, NUL, out, raw

import git from "../git.js"

NUL = '\0'
toExport["relativeTo"] = async function ()
{
    await section("paths inside the prefix lose it", async function ()
    {
        compare(git.relativeTo('lib/b.mjs','lib/'),'b.mjs')
        compare(git.relativeTo('lib/deep/x.txt','lib/'),'deep/x.txt')
        compare(git.relativeTo('lib/deep/x.txt','lib/deep/'),'x.txt')
    })
    await section("siblings gain one ../ per level climbed", async function ()
    {
        compare(git.relativeTo('test/c.mjs','lib/'),'../test/c.mjs')
        compare(git.relativeTo('top.txt','lib/'),'../top.txt')
        compare(git.relativeTo('lib/b.mjs','test/'),'../lib/b.mjs')
        compare(git.relativeTo('x.txt','deep/a/'),'../../x.txt')
        compare(git.relativeTo('a/b/c/d.txt','a/b/c/'),'d.txt')
    })
    await section("an empty prefix (the repository root) is a no-op", async function ()
    {
        compare(git.relativeTo('top.txt',''),'top.txt')
        compare(git.relativeTo('lib/b.mjs',''),'lib/b.mjs')
    })
}
toExport["relativeTo"]._section_ = true
toExport["relativise"] = async function ()
{
    await section("rewrites all three groups", async function ()
    {
        raw = ['1 M. N... 100644 100644 100644 a b lib/b.mjs','1 .M N... 100644 100644 100644 a c test/c.mjs','? lib/new.txt'].join(NUL) + NUL
        data = git.parseStatusV2(raw)
        out = git.relativise(data,'lib/')
        compare(out.staged[0].path,'b.mjs')
        compare(out.unstaged[0].path,'../test/c.mjs')
        compare(out.untracked[0].path,'new.txt')
    })
    await section("the rename origin is dropped, since the new path is relative", async function ()
    {
        raw = ['2 RM N... 100644 100644 100644 a b R100 lib/new.txt','lib/old.txt'].join(NUL) + NUL
        data = git.parseStatusV2(raw)
        out = git.relativise(data,'lib/')
        compare(out.staged[0].path,'new.txt')
        compare(out.staged[0].orig,undefined)
    })
    await section("a no-op at the repository root", async function ()
    {
        raw = ['1 M. N... 100644 100644 100644 a b lib/b.mjs'].join(NUL) + NUL
        out = git.relativise(git.parseStatusV2(raw),'')
        compare(out.staged[0].path,'lib/b.mjs')
    })
}
toExport["relativise"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVsYXRpdmlzZS5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L3JlbGF0aXZpc2Uua29kZSJdLCJtYXBwaW5ncyI6Ijs7O09BY08sVUFBQTs7QUFFUCxNQUFNOzs7OztRQU1zQyxRQUFwQyxJQUFJLFdBQVcsWUFBYSxRQUFVO1FBQ0csUUFBekMsSUFBSSxXQUFXLGlCQUFrQixRQUFVO1FBQ0csUUFBOUMsSUFBSSxXQUFXLGlCQUFrQixhQUFlOzs7O1FBSVgsUUFBckMsSUFBSSxXQUFXLGFBQWMsUUFBVTtRQUNMLFFBQWxDLElBQUksV0FBVyxVQUFXLFFBQVU7UUFDQyxRQUFyQyxJQUFJLFdBQVcsWUFBYSxTQUFXO1FBQ0osUUFBbkMsSUFBSSxXQUFXLFFBQVMsV0FBYTtRQUNHLFFBQXhDLElBQUksV0FBVyxjQUFlLFVBQVk7Ozs7UUFJWixRQUE5QixJQUFJLFdBQVcsVUFBVyxJQUFNO1FBQ0EsUUFBaEMsSUFBSSxXQUFXLFlBQWEsSUFBTTs7Ozs7Ozs7UUFNbEMsT0FDSSwrQ0FDQSxnREFDQSxpQkFDRSxLQUFLLE9BQU87UUFFbEIsT0FBTyxJQUFJLGNBQWM7UUFDekIsTUFBTyxJQUFJLFdBQVcsS0FBTTtRQUVULFFBQW5CLElBQUksT0FBTyxHQUFHLEtBQU87UUFDQSxRQUFyQixJQUFJLFNBQVMsR0FBRyxLQUFPO1FBQ0QsUUFBdEIsSUFBSSxVQUFVLEdBQUcsS0FBTzs7OztRQUl4QixPQUFPLHNEQUF1RCxlQUFlLEtBQUssT0FBTztRQUN6RixPQUFPLElBQUksY0FBYztRQUN6QixNQUFPLElBQUksV0FBVyxLQUFNO1FBRVQsUUFBbkIsSUFBSSxPQUFPLEdBQUcsS0FBTztRQUNGLFFBQW5CLElBQUksT0FBTyxHQUFHLEtBQU87Ozs7UUFJckIsT0FBTyxnREFBZ0QsS0FBSyxPQUFPO1FBQ25FLE1BQU0sSUFBSSxXQUFXLElBQUksY0FBYyxLQUFNO1FBRTFCLFFBQW5CLElBQUksT0FBTyxHQUFHLEtBQU8ifQ==
//# sourceURL=../../kode/test/relativise.kode
