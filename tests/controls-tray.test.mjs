import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

test('tray peeks, reveals its tab on hover, and opens widgets only on click or hotkey', () => {
    const monitors = [{ name: 'left' }, { name: 'right' }]
    let active = monitors[0], animated = true
    const informationWidgets = []
    const docks = [], listeners = new Set(), configListeners = new Set(), timers = new Set()
    const widget = (props) => ({
        children: [], visible: true, signals: {}, child_revealed: false, ...props,
        add(child) { this.children.push(child) },
        show_all() { this.visible = true },
        connect(signal, cb) { this.signals[signal] = cb },
        set_size_request(w, h) { this.widthRequest = w; this.heightRequest = h },
        add_events() {}, queue_draw() {}, get_accessible() { return { set_name() {} } },
    })
    const context = vm.createContext({
        Box: widget, Button: widget, EventBox: widget, Revealer: widget, DrawingArea: widget,
        activeMonitor: () => active,
        Gtk: { Align: { START: 1, END: 2 }, RevealerTransitionType: { SLIDE_UP: 1 } },
        Gdk: { EventMask: { ENTER_NOTIFY_MASK: 1, LEAVE_NOTIFY_MASK: 2 }, NotifyType: { INFERIOR: 2 } },
        timeout: (_ms, callback) => {
            const timer = { cancel: () => timers.delete(timer), fire: () => { timers.delete(timer); callback() } }
            timers.add(timer); return timer
        },
        Toggles: (mon, notifications) => { docks.push({ mon, notifications }); return widget({}) },
        HorizDock: () => widget({}),
        WeatherPanel: mon => { informationWidgets.push(["weather", mon]); return widget({}) },
        MarketsPanel: mon => { informationWidgets.push(["markets", mon]); return widget({}) }, scaleOf: () => 1, TITLE: 'Quantico',
        NEON: { dock: [1, 2, 3], modalbg: [4, 5, 6] },
        rgbToHex: () => '#010203',
        animOn: () => animated,
        onColorChange: cb => { listeners.add(cb); return () => listeners.delete(cb) },
        onConfigChange: cb => { configListeners.add(cb); return () => configListeners.delete(cb) },
    })
    const source = ['util-tray', 'controls-tray', 'information-tray'].map(name =>
        readFileSync(`components/modules/${name}.ts`, 'utf8')
            .replace(/^import .*\n/gm, '').replace(/^export /gm, '')).join('\n')
    vm.runInContext(stripTypeScriptTypes(source) +
        '\nglobalThis.api = { ControlsTray, toggleControlsTray, InformationTray, toggleInformationTray }', context)
    const { ControlsTray, toggleControlsTray, InformationTray, toggleInformationTray } = context.api
    const left = ControlsTray(monitors[0]), right = ControlsTray(monitors[1])
    const [body, tab] = left.child.children
    const enter = detail => left.signals['enter-notify-event'](left, { detail })
    const leave = detail => left.signals['leave-notify-event'](left, { detail })
    const face = tab.child
    const settle = () => {
        for (let i = 0; timers.size && i < 100; i++) [...timers][0].fire()
        assert.equal(timers.size, 0, 'animations finish')
    }
    assert.equal(docks.length, 0)
    assert.equal(face.heightRequest, 6)
    assert.equal(tab.tooltipText, undefined)
    enter(0); settle()
    assert.equal(face.heightRequest, 36)
    assert.equal(docks.length, 0, 'hover must not construct widgets')
    assert.equal(body.reveal_child, undefined)
    leave(2)
    assert.equal(timers.size, 0, 'child crossings do not retract the tab')
    leave(0)
    enter(0); settle()
    assert.equal(face.heightRequest, 36, 'returning cancels retraction')
    leave(0); settle()
    assert.equal(face.heightRequest, 6)
    enter(0); settle()
    tab.onClicked(); settle()
    const content = body.children[0]
    assert.equal(body.reveal_child, true)
    assert.equal(content.no_show_all, true)
    assert.equal(docks[0].notifications, false)
    leave(0); settle()
    assert.equal(body.reveal_child, true, 'clicked-open widgets stay open on pointer exit')
    assert.equal(face.heightRequest, 36)
    body.child_revealed = true
    tab.onClicked(); settle()
    assert.equal(body.reveal_child, false)
    assert.equal(content.visible, true, 'content remains visible through the slide')
    body.child_revealed = false
    body.signals['notify::child-revealed']()
    assert.equal(content.visible, false)
    assert.equal(face.heightRequest, 6)
    assert.equal(toggleControlsTray(), true)
    settle()
    assert.equal(docks.length, 1, 'reopening reuses controls')
    assert.equal(toggleControlsTray(), false)
    animated = false
    for (const cb of configListeners) cb()
    assert.equal(body.transition_duration, 0)
    enter(0)
    assert.equal(face.heightRequest, 36, 'reduced motion reveals the tab immediately')
    leave(0); settle()
    assert.equal(face.heightRequest, 6)
    active = monitors[1]
    assert.equal(toggleControlsTray(), true)
    assert.equal(body.reveal_child, false, 'hotkey affects only the active monitor')
    left.signals.unmap()
    leave(0)
    const info = InformationTray(monitors[1])
    const [infoBody, infoTab] = info.child.children
    assert.equal(infoTab.halign, 2)
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
    right.signals.destroy()
    left.signals.destroy()
    assert.equal(timers.size, 0)
    assert.equal(listeners.size, 0)
    assert.equal(configListeners.size, 0)
    assert.equal(toggleControlsTray(), false)
})
