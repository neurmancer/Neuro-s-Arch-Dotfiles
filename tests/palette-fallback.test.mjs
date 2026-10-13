import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

test('unavailable saved palettes use default colors and retain explicit overrides', () => {
    const source = readFileSync('components/modules/colors.ts', 'utf8')
        .replace(/^import .*\n/gm, '').replace(/^export /gm, '')
    const saved = `local palette = "RETIRED"
users["red"] = { 1, 2, 3 }
users["dock"] = { 4, 5, 6 }
users["modalbg"] = { 7, 8, 9, 0.3 }
over["dock"] = true
over["modalbg"] = true`
    const context = vm.createContext({
        TextDecoder,
        CYBER_DIR: '/fixture', USER_DIR: '/fixture/user',
        GLib: {
            file_get_contents: () => [true, new TextEncoder().encode(saved)],
            file_set_contents() {},
        },
        latestTask: () => async () => true,
        print: (...args) => assert.fail(args.join(' ')),
    })
    vm.runInContext(stripTypeScriptTypes(source), context)
    vm.runInContext('loadUserColors()', context)
    const state = JSON.parse(vm.runInContext(`JSON.stringify({
        palette: getActivePalette(), red: NEON.red, expectedRed: PALETTES.NETWATCH.red,
        dock: NEON.dock, bg: NEON.modalbg, alpha: getUserAlpha("modalbg")
    })`, context))
    assert.equal(state.palette, 'NETWATCH')
    assert.deepEqual(state.red, state.expectedRed)
    assert.deepEqual(state.dock, [4, 5, 6])
    assert.deepEqual(state.bg, [7, 8, 9])
    assert.equal(state.alpha, 0.3)
})
