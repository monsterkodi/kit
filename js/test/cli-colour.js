var toExport = {}
var forced, kit, KIT, lg, noColour, palette, piped, plain, quiet, SGR, st

import url from "url"
import child_process from "child_process"

import status from "../status.js"

import log from "../log.js"

import theme from "../theme.js"

import helpers from "./helpers.js"
let matches = helpers.matches
let notMatches = helpers.notMatches

KIT = url.fileURLToPath(new URL('../../bin/kit',import.meta.url))
SGR = /\u001b\[[0-9;]*m/

kit = function (args, env = {})
{
    var r

    r = child_process.spawnSync(process.execPath,[KIT].concat(args),{encoding:'utf8',env:Object.assign({},process.env,{NO_COLOR:undefined,TERM:'xterm'},env)})
    return {code:r.status,out:r.stdout,err:r.stderr}
}
toExport["kit log"] = async function ()
{
    await section("colour follows the stream, not the environment", async function ()
    {
        piped = kit(['log','1'])
        compare(piped.out.length > 0,true)
        notMatches(piped.out,SGR)
        forced = kit(['log','1'],{FORCE_COLOUR:'1'})
        compare(forced.out,piped.out)
    })
    await section("NO_COLOR still wins when a terminal is faked", async function ()
    {
        plain = kit(['log','1'])
        noColour = kit(['log','1'],{NO_COLOR:'1'})
        compare(plain.code,noColour.code)
        notMatches(noColour.out,SGR)
    })
}
toExport["kit log"]._section_ = true
toExport["every subcommand"] = async function ()
{
    await section("still runs with the palette threaded through", async function ()
    {
        quiet = {log:function ()
        {},error:function ()
        {}}
        palette = theme.createTheme(true)
        st = status.status([],quiet,{theme:palette})
        compare([0,128].includes(st),true)
        lg = log.log(['log','1'],quiet,{theme:palette})
        compare([0,1,128].includes(lg),true)
    })
}
toExport["every subcommand"]._section_ = true
toExport._test_ = true
export default toExport


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNvbG91ci5qcyIsInNvdXJjZXMiOlsiLi4vLi4va29kZS90ZXN0L2NsaS1jb2xvdXIua29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQWNBLE1BQU0sSUFBSSxrQkFBa0IsSUFBSSxnQkFBaUIsT0FBTyxLQUFLO0FBRTdELE1BQU07O0FBRU47Ozs7SUFFSSxJQUFJLGNBQWMsVUFBVSxRQUFRLFVBQVcsS0FBSyxPQUFPLE9BQ3ZELFNBQVUsT0FDVixJQUFLLE9BQU8sVUFBVyxRQUFRLEtBQU0sU0FBVSxVQUFXLEtBQU0sU0FBVTtZQUc5RSxLQUFNLEVBQUUsT0FDUixJQUFLLEVBQUUsT0FDUCxJQUFLLEVBQUU7Ozs7OztRQU1ILFFBQVEsS0FBSyxNQUFPO2dCQUVwQixNQUFNLElBQUksU0FBUyxFQUFJO1FBQ3ZCLFdBQVcsTUFBTSxJQUFLO1FBRXRCLFNBQVMsS0FBSyxNQUFPLE1BQU8sYUFBYztnQkFFMUMsT0FBTyxJQUFNLE1BQU07Ozs7UUFJbkIsUUFBUSxLQUFLLE1BQU87UUFDcEIsV0FBVyxLQUFLLE1BQU8sTUFBTyxTQUFVO2dCQUV4QyxNQUFNLEtBQU8sU0FBUztRQUN0QixXQUFXLFNBQVMsSUFBSzs7Ozs7Ozs7UUFNekIsU0FDSTtXQUNBOztRQUVKLFVBQVUsTUFBTSxZQUFZO1FBRTVCLEtBQUssT0FBTyxVQUFXLE9BQVEsTUFBTztpQkFDckMsRUFBRSxLQUFLLFNBQVMsSUFBTTtRQUV2QixLQUFLLElBQUksS0FBSyxNQUFPLEtBQU0sT0FBUSxNQUFPO2lCQUN6QyxFQUFFLEVBQUUsS0FBSyxTQUFTLElBQU0ifQ==
//# sourceURL=file:///home/kodi/s/kit/kode/test/cli-colour.kode
