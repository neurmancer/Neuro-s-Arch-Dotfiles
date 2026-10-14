import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

function fixture(animated = true) {
    let now = 1_000_000, next = 1
    const ticks = new Map(), timers = new Set(), colors = new Set(), configs = new Set(), labels = [], calls = []
    const widget = props => ({
        ...props, signals: {},
        connect(s, cb) { this.signals[s] = cb },
        queue_draw() {}, set_size_request() {}, set_margin_left() {},
        add_tick_callback(cb) { const id = next++; ticks.set(id, cb); return id },
        remove_tick_callback(id) { ticks.delete(id) },
    })
    const schedule = (ms, cb, repeat) => {
        const timer = { ms, repeat, cancel: () => timers.delete(timer), fire: () => { if (!repeat) timers.delete(timer); return cb() } }
        timers.add(timer); return timer
    }
    const context = vm.createContext({
        TextDecoder, print() {}, Window: widget, DrawingArea: widget,
        activeMonitor: () => ({}), SCALE: 1, winScale: () => 1,
        Anchor: { LEFT: 1 }, Layer: { OVERLAY: 1 }, Exclusivity: { IGNORE: 1 },
        CYBER_DIR: '/fixture', USER_DIR: '/fixture/user', TITLE: 'Quantico', MONO: 'Tektur',
        GLib: { get_monotonic_time: () => now, file_test: () => false, FileTest: { EXISTS: 1 } }, Gio: {},
        passthrough: win => { win.passThrough = true },
        interval: (ms, cb) => schedule(ms, cb, true), timeout: (ms, cb) => schedule(ms, cb, false),
        animOn: () => animated, isOvr: () => false,
        onColorChange: cb => { colors.add(cb); return () => colors.delete(cb) },
        onConfigChange: cb => { configs.add(cb); return () => configs.delete(cb) },
        readUserLua: () => ({ themeMod: 'SUPER + SHIFT', rebinds: [{ action_id: 'hud.aur', combo: 'CTRL + F11' }] }),
        readThemeActions: () => [
            { id: 'hud.aur', mod: '@themeMod', key: 'U' },
            { id: 'hud.update', mod: '@themeMod', key: 'Q' },
            { id: 'hud.aurdis', mod: '@themeMod', key: 'J' },
        ],
        execAsync: async args => { calls.push(args); return args[2].includes('scripts/aur') ? '11\npkg 1 -> 2\n' : '1\n1.0\n1.1\nRelease notes\n' },
    })
    const palette = readFileSync('components/modules/colors.ts', 'utf8')
    const binds = readFileSync('components/modules/userbinds.ts', 'utf8')
    const src = palette.slice(palette.indexOf('export const NEON:'), palette.indexOf('export type PaletteName')) + '\n' +
        binds.slice(binds.indexOf('export const resolveCombo'), binds.indexOf('export const checkConflict')) + '\n' +
        readFileSync('components/modules/aurbar.ts', 'utf8').replace(/^import .*\n/gm, '')
    vm.runInContext(stripTypeScriptTypes(src.replace(/^export /gm, '')), context)
    const run = code => vm.runInContext(code, context)
    const win = run('AurBarWindow()')
    const ctx = new Proxy({ showText: text => labels.push(text), textExtents: text => ({ width: text.length * 6 }) }, { get: (o, k) => o[k] || (() => {}) })
    const frame = ms => { now += ms * 1000; for (const [id, cb] of [...ticks]) if (!cb(null, { get_frame_time: () => now })) ticks.delete(id) }
    const draw = () => { labels.length = 0; win.child.signals.draw(win.child, ctx); return labels }
    return { run, win, ticks, timers, colors, configs, calls, frame, draw,
        reducedMotion: () => { animated = false; for (const cb of configs) cb() } }
}

test('package notice renders real palette colors, counts, and rebound shortcuts without idle animation', async () => {
    const f = fixture()
    await f.run('getAurUpdates()')
    f.run('showAurBar()'); f.frame(200)
    assert.ok(f.draw().includes('11 PACKAGES READY'))
    assert.ok(f.draw().includes('Repository + AUR updates available'))
    assert.ok(f.draw().includes('CTRL + F11'))
    assert.ok(f.draw().includes('SUPER + SHIFT + J'))
    assert.equal(f.ticks.size, 0)
    assert.ok(f.win.passThrough)
    assert.ok([...f.timers].filter(t => t.repeat).every(t => t.ms >= 1800000), 'no 16ms animation timer')
    f.run('dismissAurBar()'); f.frame(200)
    assert.equal(f.win.visible, false)
    f.run('showAurBar()')
    assert.equal(f.win.visible, false, 'dismissed package notice stays dismissed')
    f.win.signals.destroy()
    assert.equal(f.timers.size, 0)
    assert.equal(f.colors.size, 0)
    assert.equal(f.configs.size, 0)
})

test('theme priority, installed confirmation and deferred package notice survive transitions', async () => {
    const f = fixture()
    await f.run('bootCheck()')
    await new Promise(resolve => setImmediate(resolve))
    f.frame(200)
    assert.ok(f.draw().includes('ENVIRONMENT UPDATE'))
    assert.ok(f.draw().includes('1.0 → 1.1'))
    f.run('dismissThemeBar()'); f.frame(200)
    const deferred = [...f.timers].find(t => t.ms === 2000)
    assert.ok(deferred)
    deferred.fire(); f.frame(200)
    assert.ok(f.draw().includes('11 PACKAGES READY'))
    f.run('showInstalled("PACKAGE INSTALLED", "example 2.0")')
    assert.ok(f.draw().includes('PACKAGE INSTALLED'))
    assert.ok(!f.draw().includes('REVIEW UPDATES'))
    f.run('dismissAurBar()'); f.frame(200)
    const afterInstalled = [...f.timers].find(t => t.ms === 500)
    assert.ok(afterInstalled)
    afterInstalled.fire(); f.frame(200)
    assert.ok(f.draw().includes('11 PACKAGES READY'), 'confirmation dismissal does not dismiss package updates')
    f.win.signals.destroy()
    assert.equal(f.ticks.size, 0)
    assert.equal(f.timers.size, 0)
})

test('reduced motion settles immediately and long titles stay within the card', async () => {
    const f = fixture()
    await f.run('getAurUpdates()')
    f.run('showAurBar()'); f.frame(30)
    f.reducedMotion()
    assert.equal(f.ticks.size, 0)
    assert.equal(f.run('phase'), 'shown')
    f.run('showInstalled("A VERY LONG PACKAGE NAME ".repeat(20), "version details ".repeat(30))')
    assert.ok(f.draw().some(s => s.endsWith('…')))
    f.run('dismissAurBar()')
    assert.equal(f.win.visible, false)
    f.win.signals.destroy()
})
