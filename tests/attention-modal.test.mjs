import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

test('dialog hover/focus drives its frame and entrance paints the final frame', () => {
    const noop = () => {}, ticks = new Map(), timers = new Set(), listeners = new Set(), colorListeners = new Set()
    let now = 1_000_000, next = 1, frameAttention, drawnIntro
    const drawingContext = new Proxy({}, { get: () => noop })
    const widget = props => ({
        ...props, signals: {}, redraws: 0, is_active: false,
        connect(s, cb) { this.signals[s] = cb }, add_events: noop, set_size_request: noop,
        queue_draw() { this.redraws++ }, get_mapped: () => true,
        add_tick_callback(cb) { const id = next++; ticks.set(id, cb); return id }, remove_tick_callback: id => ticks.delete(id),
    })
    const context = vm.createContext({
        Window: widget, DrawingArea: widget, EventBox: widget,
        GLib: { get_monotonic_time: () => now },
        Gdk: { EventMask: {}, NotifyType: { INFERIOR: 2 } },
        Cairo: { Format: { ARGB32: 0 }, ImageSurface: class { flush() {} }, Context: class { constructor() { return drawingContext } } },
        NEON: { dock: [193,112,255], press: [0,235,116] },
        CYAN: [1,1,1], ACC: [1,1,1], TITLE: 'test', HEADER: 36, SCALE: 1, SS_DEFAULT: 1,
        HUDC: null, Layer: { OVERLAY: 1 }, Exclusivity: { IGNORE: 1 }, Keymode: { EXCLUSIVE: 1 },
        makePlane: ({w,h}) => ({ width: w, height: h }),
        winScale: () => 1, monW: () => 1920, activeMonitor: () => ({}),
        animOn: () => true, cfgStr: () => 'off', setTxtFX: noop, txt: noop, fireChange: noop,
        onConfigChange: cb => { listeners.add(cb); return () => listeners.delete(cb) },
        onColorChange: cb => { colorListeners.add(cb); return () => colorListeners.delete(cb) },
        drawGlass: (...args) => { frameAttention = args.at(-1) },
        warpReveal: (...args) => { drawnIntro = args[5] },
        unwarpRevealPoint: (x,y) => x >= 0 ? [x,y] : null,
        interval: (ms, cb) => { const timer = { ms, cb, cancel: () => timers.delete(timer) }; timers.add(timer); return timer },
        timeout: noop,
    })
    const helper = readFileSync('components/modules/attention.ts', 'utf8').replace(/^import .*\n/gm, '')
    const modal = readFileSync('components/modules/cmodal.ts', 'utf8')
    const source = helper + '\n' + modal.slice(modal.indexOf('export const createModal'), modal.indexOf('export const sectionHeader'))
    vm.runInContext(stripTypeScriptTypes(source.replace(/^export /gm, '')) + '\nglobalThis.create = createModal', context)
    const ctrl = context.create({ name: 'test', W: 400, H: 200, tabTitle: 'Test', draw: noop })
    const win = ctrl.win, events = win.child, area = events.child
    const frame = () => { now += 200_000; for (const [id, cb] of [...ticks]) if (!cb(null, {get_frame_time: () => now})) ticks.delete(id) }
    ctrl.open()
    const intro = [...timers].find(t => t.ms === 60)
    for (let i=0; i<4; i++) intro.cb()
    const redraws = area.redraws
    intro.cb()
    assert.ok(area.redraws > redraws, 'the last reveal step requests a paint')
    area.signals.draw(area, drawingContext)
    assert.equal(drawnIntro, 1)
    events.signals['enter-notify-event'](events, { detail: 0, x: 40, y: 40 }); frame()
    assert.equal(frameAttention.value, 1)
    win.is_active = true; win.signals['notify::is-active']()
    events.signals['leave-notify-event'](events, { detail: 0 }); frame()
    assert.equal(frameAttention.value, 1, 'focus survives pointer exit')
    assert.equal(frameAttention.focused, true)
    win.is_active = false; win.signals['notify::is-active'](); frame()
    assert.equal(frameAttention.value, 0)
    events.signals['enter-notify-event'](events, { detail: 0, x: 40, y: 40 }); frame()
    events.signals['leave-notify-event'](events, { detail: 2 })
    assert.equal(frameAttention.value, 1, 'crossing a child does not clear hover')
    ctrl.close(); area.signals.unmap()
    assert.equal(frameAttention.value, 0); assert.equal(ticks.size, 0)
    win.signals.destroy()
    assert.equal(timers.size, 0); assert.equal(listeners.size, 0); assert.equal(colorListeners.size, 0)
})
