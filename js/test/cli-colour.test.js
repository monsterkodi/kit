var kit, KIT, SGR

import test from 'node:test'
import assert from 'node:assert/strict'
import url from "url"
import child_process from "child_process"

import status from "../status.js"

import log from "../log.js"

import theme from "../theme.js"

KIT = url.fileURLToPath(new URL('../../bin/kit',import.meta.url))
SGR = /\u001b\[[0-9;]*m/

kit = function (args, env = {})
{
    var r

    r = child_process.spawnSync(process.execPath,[KIT].concat(args),{encoding:'utf8',env:Object.assign({},process.env,{NO_COLOR:undefined,TERM:'xterm'},env)})
    return {code:r.status,out:r.stdout,err:r.stderr}
}
test('kit log: colour follows the stream, not the environment',function ()
{
    var forced, piped

    piped = kit(['log','1'])
    assert.ok(piped.out,'the entry point ran')
    assert.doesNotMatch(piped.out,SGR,'piped output is plain with NO_COLOR unset')
    forced = kit(['log','1'],{FORCE_COLOUR:'1'})
    return assert.equal(forced.out,piped.out,'output does not vary')
})
test('kit log: NO_COLOR still wins when a terminal is faked',function ()
{
    var noColour, plain

    plain = kit(['log','1'])
    noColour = kit(['log','1'],{NO_COLOR:'1'})
    assert.equal(plain.code,noColour.code)
    return assert.doesNotMatch(noColour.out,SGR)
})
test('every subcommand still runs with the palette threaded through',function ()
{
    var lg, palette, quiet, st

    quiet = {log:function ()
    {},error:function ()
    {}}
    palette = theme.createTheme(true)
    st = status.status([],quiet,{theme:palette})
    assert.ok([0,128].includes(st),`status returned ${st}`)
    lg = log.log(['log','1'],quiet,{theme:palette})
    return assert.ok([0,1,128].includes(lg),`log returned ${lg}`)
})

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNvbG91ci50ZXN0LmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvY2xpLWNvbG91ci50ZXN0LmtvZGUiXSwibWFwcGluZ3MiOiI7O09BUU8sS0FBSyxLQUFLO09BQ1YsT0FBTyxLQUFLOzs7Ozs7Ozs7O0FBT25CLE1BQU0sSUFBSSxrQkFBa0IsSUFBSSxnQkFBaUIsT0FBTyxLQUFLO0FBRTdELE1BQU07O0FBRU47Ozs7SUFFSSxJQUFJLGNBQWMsVUFBVSxRQUFRLFVBQVcsS0FBSyxPQUFPLE9BQ3ZELFNBQVUsT0FDVixJQUFLLE9BQU8sVUFBVyxRQUFRLEtBQU0sU0FBVSxVQUFXLEtBQU0sU0FBVTtZQUc5RSxLQUFNLEVBQUUsT0FDUixJQUFLLEVBQUUsT0FDUCxJQUFLLEVBQUU7O0FBRVgsS0FBSzs7OztJQUVELFFBQVEsS0FBSyxNQUFPO0lBRXBCLE9BQU8sR0FBRyxNQUFNLElBQUs7SUFDckIsT0FBTyxhQUFhLE1BQU0sSUFBSyxJQUFLO0lBRXBDLFNBQVMsS0FBSyxNQUFPLE1BQU8sYUFBYztXQUUxQyxPQUFPLE1BQU0sT0FBTyxJQUFLLE1BQU0sSUFBSzs7QUFFeEMsS0FBSzs7OztJQUVELFFBQVEsS0FBSyxNQUFPO0lBQ3BCLFdBQVcsS0FBSyxNQUFPLE1BQU8sU0FBVTtJQUV4QyxPQUFPLE1BQU0sTUFBTSxLQUFNLFNBQVM7V0FDbEMsT0FBTyxhQUFhLFNBQVMsSUFBSzs7QUFFdEMsS0FBSzs7OztJQUVELFNBQ0k7T0FDQTs7SUFFSixVQUFVLE1BQU0sWUFBWTtJQUU1QixLQUFLLE9BQU8sVUFBVyxPQUFRLE1BQU87SUFDdEMsT0FBTyxJQUFJLEVBQUcsS0FBSyxTQUFTLHVCQUF3QjtJQUVwRCxLQUFLLElBQUksS0FBSyxNQUFPLEtBQU0sT0FBUSxNQUFPO1dBQzFDLE9BQU8sSUFBSSxFQUFHLEVBQUcsS0FBSyxTQUFTLG9CQUFxQiJ9
//# sourceURL=file:///home/kodi/s/kit/kode/test/cli-colour.test.kode
