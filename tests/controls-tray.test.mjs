import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

test('tray peeks, reveals its tab on hover, and opens widgets only on click or hotkey', () => {
    const monitors = [{ name: 'left' }, { name: 'right' }]
    let active = monitors[0], animated = true
    const informationWidgets = [], systemWidgets = []
    const docks = [], listeners = new Set(), configListeners = new Set(), ticks = new Map()
    let frameTime = 1_000_000, nextTick = 1, allocations = 0, inputChanges = 0
    const widget = (props) => ({
        children: [], visible: true, signals: {}, child_revealed: false, ...props,
        add(child) { this.children.push(child) },
        show_all() { this.visible = true },
        connect(signal, cb) { this.signals[signal] = cb },
        set_size_request() { allocations++ },
        get_mapped() { return this.visible },
        get_frame_clock() { return { get_frame_time: () => frameTime } },
        add_tick_callback(cb) { const id = nextTick++; ticks.set(id, cb); return id },
        remove_tick_callback(id) { ticks.delete(id) },
        add_events() {}, queue_draw() {}, get_accessible() { return { set_name() {} } },
    })
    const context = vm.createContext({
        Box: widget, Button: widget, EventBox: widget, Revealer: widget, DrawingArea: widget,
        activeMonitor: () => active,
        Gtk: { Align: { START: 1, END: 2, CENTER: 3 }, RevealerTransitionType: { SLIDE_UP: 1, SLIDE_LEFT: 2, SLIDE_DOWN: 3 } },
        Gdk: { EventMask: { ENTER_NOTIFY_MASK: 1, LEAVE_NOTIFY_MASK: 2 }, NotifyType: { INFERIOR: 2 } },
        GLib: { get_monotonic_time: () => frameTime },
        Toggles: (mon, notifications) => { docks.push({ mon, notifications }); return widget({}) },
        HorizDock: () => widget({}),
        WeatherPanel: mon => { informationWidgets.push(["weather", mon]); return widget({}) },
        SystemPanel: mon => { systemWidgets.push(mon); return widget({}) },
        MarketsPanel: mon => { informationWidgets.push(["markets", mon]); return widget({}) }, scaleOf: () => 1, TITLE: 'Quantico', MONO: 'Tektur',
        NEON: { dock: [1, 2, 3], modalbg: [4, 5, 6] },
        rgbToHex: () => '#010203',
        animOn: () => animated,
        onColorChange: cb => { listeners.add(cb); return () => listeners.delete(cb) },
        onConfigChange: cb => { configListeners.add(cb); return () => configListeners.delete(cb) },
    })
    const source = ['input-region', 'util-tray', 'controls-tray', 'information-tray', 'system-tray'].map(name =>
        readFileSync(`components/modules/${name}.ts`, 'utf8')
            .replace(/^import .*\n/gm, '').replace(/^export /gm, '')).join('\n')
    vm.runInContext(stripTypeScriptTypes(source) +
        '\nglobalThis.api = { ControlsTray, toggleControlsTray, InformationTray, toggleInformationTray, SystemTray, toggleSystemTray }', context)
    const { ControlsTray, toggleControlsTray, InformationTray, toggleInformationTray, SystemTray, toggleSystemTray } = context.api
    const left = ControlsTray(monitors[0]), right = ControlsTray(monitors[1])
    left._onHudInputChanged = () => inputChanges++
    const [body, tab] = left.child.children
    const enter = detail => left.signals['enter-notify-event'](left, { detail })
    const leave = detail => left.signals['leave-notify-event'](left, { detail })
    const face = tab.child
    const frame = ms => {
        frameTime += ms * 1000
        for (const [id, cb] of [...ticks]) if (!cb(null, { get_frame_time: () => frameTime })) ticks.delete(id)
    }
    const settle = () => { frame(200); assert.equal(ticks.size, 0, 'animations finish by elapsed time') }
    const peeking = area => Math.min(...area._hudInputRects().map(r => r.y)) === 38
    assert.equal(docks.length, 0)
    assert.equal(face.heightRequest, 44, 'tab reserves a fixed canvas')
    assert.ok(peeking(face))
    assert.equal(tab.tooltipText, undefined)
    enter(0)
    const firstTick = [...ticks.keys()][0]
    frame(40); enter(0)
    assert.ok(ticks.has(firstTick), 'duplicate enter does not restart the animation')
    assert.equal(inputChanges, 1, 'input geometry stays fixed during motion')
    settle()
    assert.equal(face.heightRequest, 44)
    assert.equal(docks.length, 0, 'hover must not construct widgets')
    assert.equal(body.reveal_child, undefined)
    leave(2)
    assert.equal(ticks.size, 0, 'child crossings do not retract the tab')
    leave(0)
    enter(0); settle()
    assert.equal(face.heightRequest, 44, 'returning cancels retraction')
    leave(0); settle()
    assert.ok(peeking(face))
    assert.equal(allocations, 0, 'hover never requests a layout resize')
    enter(0); settle()
    tab.onClicked(); settle()
    const content = body.children[0]
    assert.equal(body.reveal_child, true)
    assert.equal(content.no_show_all, true)
    assert.equal(docks[0].notifications, false)
    leave(0); settle()
    assert.equal(body.reveal_child, true, 'clicked-open widgets stay open on pointer exit')
    assert.equal(face.heightRequest, 44)
    body.child_revealed = true
    tab.onClicked(); settle()
    assert.equal(body.reveal_child, false)
    assert.equal(content.visible, true, 'content remains visible through the slide')
    body.child_revealed = false
    body.signals['notify::child-revealed']()
    assert.equal(content.visible, false)
    assert.ok(peeking(face))
    assert.equal(toggleControlsTray(), true)
    settle()
    assert.equal(docks.length, 1, 'reopening reuses controls')
    assert.equal(toggleControlsTray(), false)
    animated = false
    for (const cb of configListeners) cb()
    assert.equal(body.transition_duration, 0)
    enter(0)
    assert.equal(face.heightRequest, 44, 'reduced motion reveals the tab immediately')
    assert.equal(ticks.size, 0)
    assert.equal(peeking(face), false)
    leave(0); settle()
    assert.ok(peeking(face))
    active = monitors[1]
    assert.equal(toggleControlsTray(), true)
    assert.equal(body.reveal_child, false, 'hotkey affects only the active monitor')
    left.signals.unmap()
    assert.ok(peeking(face))
    animated = true
    left.visible = true
    enter(0)
    frame(10)
    leave(0)
    frame(500)
    assert.equal(ticks.size, 0, 'late frames complete rather than lengthening the animation')
    assert.ok(peeking(face))
    leave(0)
    const info = InformationTray(monitors[1])
    const [infoBody, infoTab] = info.child.children
    assert.equal(infoTab.halign, 2)
    assert.equal(infoTab.valign, 3, 'side handle stays vertically centered')
    assert.equal(info.child.vertical, false, 'side tray expands horizontally')
    assert.equal(infoBody.transitionType, 2)
    assert.equal(infoTab.child.widthRequest, 44)
    assert.equal(infoTab.child.heightRequest, 260)
    assert.ok(infoTab.child._hudInputRects().every(r => r.x >= 38), 'side peek sits at the right edge')
    info.signals['enter-notify-event'](info, { detail: 0 })
    assert.equal(informationWidgets.length, 0, 'weather and markets also stay lazy on hover')
    assert.equal(toggleInformationTray(), true)
    assert.equal(informationWidgets.length, 2)
    assert.equal(informationWidgets[0][0], 'weather')
    assert.equal(informationWidgets[1][0], 'markets')
    assert.equal(body.reveal_child, false, 'information toggle leaves controls alone')
    assert.equal(toggleInformationTray(), false)
    assert.equal(infoBody.reveal_child, false)
    infoBody.children[0].signals.destroy()
    info.signals.destroy()
    assert.equal(toggleInformationTray(), false)
    const systemLeft = SystemTray(monitors[0]), systemRight = SystemTray(monitors[1])
    const [sysTab, sysBody] = systemRight.child.children
    assert.equal(sysBody.transitionType, 3, 'top tray opens downward below its handle')
    assert.equal(sysTab.valign, 1)
    assert.ok(sysTab.child._hudInputRects().every(r => r.y >= 0 && r.y + r.height <= 6), 'peek touches top edge')
    systemRight.signals['enter-notify-event'](systemRight, { detail: 0 }); settle()
    assert.equal(systemWidgets.length, 0, 'top hover does not create or poll system widgets')
    assert.equal(toggleSystemTray(), true); settle()
    assert.equal(systemWidgets[0], monitors[1])
    assert.equal(systemLeft.child.children[1].reveal_child, undefined)
    systemRight.signals['leave-notify-event'](systemRight, { detail: 0 }); settle()
    assert.equal(sysBody.reveal_child, true, 'system tray stays open on pointer exit')
    assert.equal(toggleSystemTray(), false); settle()
    assert.ok(sysTab.child._hudInputRects().every(r => r.y + r.height <= 6))
    systemLeft.signals.destroy(); systemRight.signals.destroy()
    assert.equal(toggleSystemTray(), false)
    right.signals.destroy()
    left.signals.destroy()
    assert.equal(ticks.size, 0)
    assert.equal(allocations, 0)
    assert.equal(listeners.size, 0)
    assert.equal(configListeners.size, 0)
    assert.equal(toggleControlsTray(), false)
})
