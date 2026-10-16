var kit, KIT, SGR

import test from 'node:test'
import assert from 'node:assert/strict'
import cp from 'node:child_process'
import url from 'node:url'
import status from "../status.js"

import log from "../log.js"

import theme from "../theme.js"

KIT = url.fileURLToPath(new URL('../../bin/kit',import.meta.url))
SGR = /\u001b\[[0-9;]*m/

kit = function (args, env = {})
{
    var r

    r = cp.spawnSync(process.execPath,[KIT].concat(args),{encoding:'utf8',env:Object.assign({},process.env,{NO_COLOR:undefined,TERM:'xterm'},env)})
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNvbG91ci50ZXN0LmpzIiwic291cmNlcyI6WyIuLi8uLi9rb2RlL3Rlc3QvY2xpLWNvbG91ci50ZXN0LmtvZGUiXSwibWFwcGluZ3MiOiI7O09Bc0JPLEtBQUssS0FBSztPQUNWLE9BQU8sS0FBSztPQUVaLEdBQUcsS0FBSztPQUNSLElBQUksS0FBSzs7Ozs7OztBQU1oQixNQUFNLElBQUksa0JBQWtCLElBQUksZ0JBQWlCLE9BQU8sS0FBSztBQUU3RCxNQUFNOztBQUVOOzs7O0lBRUksSUFBSSxHQUFHLFVBQVUsUUFBUSxVQUFXLEtBQUssT0FBTyxPQUM1QyxTQUFVLE9BQ1YsSUFBSyxPQUFPLFVBQVcsUUFBUSxLQUFNLFNBQVUsVUFBVyxLQUFNLFNBQVU7WUFHOUUsS0FBTSxFQUFFLE9BQ1IsSUFBSyxFQUFFLE9BQ1AsSUFBSyxFQUFFOztBQUVYLEtBQUs7Ozs7SUFNRCxRQUFRLEtBQUssTUFBTztJQUVwQixPQUFPLEdBQUcsTUFBTSxJQUFLO0lBQ3JCLE9BQU8sYUFBYSxNQUFNLElBQUssSUFBSztJQUVwQyxTQUFTLEtBQUssTUFBTyxNQUFPLGFBQWM7V0FFMUMsT0FBTyxNQUFNLE9BQU8sSUFBSyxNQUFNLElBQUs7O0FBRXhDLEtBQUs7Ozs7SUFNRCxRQUFRLEtBQUssTUFBTztJQUNwQixXQUFXLEtBQUssTUFBTyxNQUFPLFNBQVU7SUFFeEMsT0FBTyxNQUFNLE1BQU0sS0FBTSxTQUFTO1dBQ2xDLE9BQU8sYUFBYSxTQUFTLElBQUs7O0FBRXRDLEtBQUs7Ozs7SUFNRCxTQUNJO09BQ0E7O0lBRUosVUFBVSxNQUFNLFlBQVk7SUFFNUIsS0FBSyxPQUFPLFVBQVcsT0FBUSxNQUFPO0lBQ3RDLE9BQU8sSUFBSSxFQUFHLEtBQUssU0FBUyx1QkFBd0I7SUFFcEQsS0FBSyxJQUFJLEtBQUssTUFBTyxLQUFNLE9BQVEsTUFBTztXQUMxQyxPQUFPLElBQUksRUFBRyxFQUFHLEtBQUssU0FBUyxvQkFBcUIifQ==
//# sourceURL=file://kode/test/cli-colour.test.kode
