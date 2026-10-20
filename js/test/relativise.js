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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVsYXRpdmlzZS5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L3JlbGF0aXZpc2Uua29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFnQkEsTUFBTTs7Ozs7Z0JBTUUsSUFBSSxXQUFXLFlBQWEsUUFBVTtnQkFDdEMsSUFBSSxXQUFXLGlCQUFrQixRQUFVO2dCQUMzQyxJQUFJLFdBQVcsaUJBQWtCLGFBQWU7Ozs7Z0JBSWhELElBQUksV0FBVyxhQUFjLFFBQVU7Z0JBQ3ZDLElBQUksV0FBVyxVQUFXLFFBQVU7Z0JBQ3BDLElBQUksV0FBVyxZQUFhLFNBQVc7Z0JBQ3ZDLElBQUksV0FBVyxRQUFTLFdBQWE7Z0JBQ3JDLElBQUksV0FBVyxjQUFlLFVBQVk7Ozs7Z0JBSTFDLElBQUksV0FBVyxVQUFXLElBQU07Z0JBQ2hDLElBQUksV0FBVyxZQUFhLElBQU07Ozs7Ozs7O1FBTWxDLE9BQ0ksK0NBQ0EsZ0RBQ0EsaUJBQ0UsS0FBSyxPQUFPO1FBRWxCLE9BQU8sSUFBSSxjQUFjO1FBQ3pCLE1BQU8sSUFBSSxXQUFXLEtBQU07Z0JBRTVCLElBQUksT0FBTyxHQUFHLEtBQU87Z0JBQ3JCLElBQUksU0FBUyxHQUFHLEtBQU87Z0JBQ3ZCLElBQUksVUFBVSxHQUFHLEtBQU87Ozs7UUFJeEIsT0FBTyxzREFBdUQsZUFBZSxLQUFLLE9BQU87UUFDekYsT0FBTyxJQUFJLGNBQWM7UUFDekIsTUFBTyxJQUFJLFdBQVcsS0FBTTtnQkFFNUIsSUFBSSxPQUFPLEdBQUcsS0FBTztnQkFDckIsSUFBSSxPQUFPLEdBQUcsS0FBTzs7OztRQUlyQixPQUFPLGdEQUFnRCxLQUFLLE9BQU87UUFDbkUsTUFBTSxJQUFJLFdBQVcsSUFBSSxjQUFjLEtBQU07Z0JBRTdDLElBQUksT0FBTyxHQUFHLEtBQU8ifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/test/relativise.kode
