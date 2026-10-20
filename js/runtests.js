var _k_ = {dir: function () { let url = import.meta.url.substring(7); let si = url.lastIndexOf('/'); return url.substring(0, si); }, in: function (a,l) {return (typeof l === 'string' && typeof a === 'string' && a.length ? '' : []).indexOf.call(l,a) >= 0}, file: function () { return import.meta.url.substring(7); }, list: function (l) {return l != null ? typeof l.length === 'number' ? l : [] : []}}

var DIR, fail, file, lastArg, name, test, _54_36_

import fs from "fs"
import path from "path"

import tester from "../../ked/js/kode/tester.js"

DIR = path.join(_k_.dir(),'test')
lastArg = process.argv.slice(-1)[0]
if (lastArg === 'brief')
{
    tester.logSections = false
}
else if (lastArg === 'silent')
{
    tester.logSections = false
    tester.logModules = false
}
fail = false
if (!(_k_.in(lastArg,['brief','silent'])) && lastArg !== _k_.file())
{
    file = path.join(_k_.dir(),'..',lastArg)
    test = await import(file)
    fail = !(await tester.test(test.default))
}
else
{
    var list = _k_.list(fs.readdirSync(DIR))
    for (var _a_ = 0; _a_ < list.length; _a_++)
    {
        name = list[_a_]
        if (!name.endsWith('.js'))
        {
            continue
        }
        test = await import(path.join(DIR,name))
        if (!(test.default != null ? test.default._test_ : undefined))
        {
            continue
        }
        fail = fail || !(await tester.test(test.default))
    }
}
tester.summarize()
if (fail)
{
    process.exit(1)
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGVzdHMuanMiLCJzb3VyY2VzIjpbIi4uL2tvZGUvcnVudGVzdHMua29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBa0JBLE1BQU0sS0FBSyxlQUFXO0FBRXRCLFVBQVUsUUFBUTtJQUVmLFlBQVc7O0lBRVYsT0FBTyxjQUFjOztTQUVqQixZQUFXOztJQUVmLE9BQU8sY0FBYztJQUNyQixPQUFPLGFBQWE7O0FBRXhCLE9BQU87YUFFSixTQUFnQixRQUFRLGVBQWM7O0lBSXJDLE9BQU8sS0FBSyxlQUFXLEtBQU07SUFFN0IsYUFBUyxPQUFPO0lBRWhCLGVBQWMsT0FBTyxLQUFLLEtBQUs7Ozs7d0JBSW5CLEdBQUcsWUFBWTs7OzthQUVQLEtBQUssU0FBUzs7WUFBOUI7O1FBRUEsYUFBUyxPQUFPLEtBQUssS0FBSyxJQUFLO2NBSWYsS0FBSyxrQkFBTCxLQUFLLFFBQVM7O1lBQTlCOztRQUVBLE9BQU8sZ0JBQWUsT0FBTyxLQUFLLEtBQUs7OztBQUUvQyxPQUFPO0lBRUo7O0lBQ0MsUUFBUSxLQUFLIn0=
//# sourceURL=file:///home/kodi/s/kit/kode/runtests.kode
