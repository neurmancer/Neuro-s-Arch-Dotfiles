import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const noop = () => {}
const drawContext = new Proxy({ textExtents: text => ({ width: String(text).length * 5 }) }, {
    get: (target, key) => target[key] || noop,
})
function fixture(module, saved, reply = {}) {
    const requests = [], reads = [], timers = [], areas = [], modals = new Map(), labels = []
    const widget = props => ({
        ...props, signals: {}, mapped: false,
        connect(signal, callback) { this.signals[signal] = callback },
        set_size_request: noop, add_events: noop, queue_draw: noop,
        get_mapped() { return this.mapped },
    })
    const colors = new Proxy({}, { get: () => [94, 244, 248] })
    const context = vm.createContext({
        TextDecoder, TextEncoder, imports: { cairo: {} },
        CYBER_DIR: '/fixture', USER_DIR: '/fixture/user',
        Box: widget, EventBox: widget,
        DrawingArea: props => { const area = widget(props); areas.push(area); return area },
        scaleOf: () => 1, Keymode: { ON_DEMAND: 1 },
        Gdk: { EventMask: { BUTTON_PRESS_MASK: 1, POINTER_MOTION_MASK: 2, LEAVE_NOTIFY_MASK: 4 } },
        GLib: {
            file_get_contents: path => { reads.push(path); return [true, new TextEncoder().encode(JSON.stringify(saved))] },
            file_set_contents: noop,
        },
        execAsync: async args => { requests.push(args); return JSON.stringify(reply) },
        interval: (ms, callback) => { const timer = { ms, callback, cancel: noop }; timers.push(timer); return timer },
        onColorChange: noop,
        NEON: colors, USER: colors, mapAccent: { clock: [1, 2, 3], city: [1, 2, 3], forecast: null },
        imgTint: { value: null }, neonBtn: { value: false },
        GCYAN: [1, 1, 1], GACC: [1, 1, 1], CYAN: [1, 1, 1], ACC: [1, 1, 1], RACC: [1, 1, 1], GHEAD: 30,
        TITLE: 'Test', MONO: 'Test', ICONF: 'Test', GMONO: 'Test', GTITLE: 'Test',
        ENIXE: 'Test', FROSTBITE_WIDE: 'Test', GUNSHIP_ITAL: 'Test',
        makePlane: opts => ({ width: opts.w, height: opts.h, project: (x, y) => [x, y] }),
        tiltText: (_ctx, _plane, _x, _y, text) => labels.push(text),
        gtxt: (_ctx, _x, _y, text) => labels.push(text), gpango: noop,
        strokePath: noop, fillQuad: noop, tintSurface: noop, pip: () => false, projQuad: () => [], openTimeModal: noop,
        createModal: options => {
            let open = false
            const modal = {
                options, requestDraw: noop, isOpen: () => open,
                open() { open = true; options.onOpen?.() },
                close() { open = false },
                toggle() { if (open) this.close(); else this.open() },
            }
            modals.set(options.name, modal)
            return modal
        },
        print: noop,
    })
    const source = readFileSync(`components/modules/${module}.ts`, 'utf8')
        .replace(/^import .*\n/gm, '').replace(/^export /gm, '')
    vm.runInContext(stripTypeScriptTypes(source), context)
    return { context, requests, reads, timers, areas, modals, labels, run: code => vm.runInContext(code, context) }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('forecast shortcut loads saved location without constructing the tray or fetching maps', async () => {
    const f = fixture('weather', { name: 'TEST CITY', full: 'TEST CITY, REGION', lat: 12, lon: -34, mapLat: 99 }, {
        current: { temperature_2m: 20, apparent_temperature: 18, relative_humidity_2m: 40, weather_code: 0, wind_speed_10m: 5 },
        daily: { time: ['2026-10-13'], temperature_2m_max: [22], temperature_2m_min: [11] },
    })
    f.run('openForecastModal()')
    await flush()
    assert.equal(f.areas.length, 0)
    assert.equal(f.reads[0], '/fixture/user/city.json')
    assert.ok(f.requests.every(args => args[0] === 'curl'))
    assert.match(f.requests[0].at(-1), /latitude=12&longitude=-34/)
    f.modals.get('forecast').options.draw(drawContext, { X: 0, Y: 0, w: 940, h: 480, push: noop })
    assert.ok(f.labels.includes('TEST CITY, REGION'))
    assert.ok(f.labels.includes('12.000°N 34.000°W'))
    const weatherPoll = f.timers.find(t => t.ms === 1_800_000)
    const before = f.requests.length
    f.modals.get('forecast').close()
    weatherPoll.callback(); await flush()
    assert.equal(f.requests.length, before, 'closed tray and modal do not poll')
    f.run('WeatherPanel({})')
    assert.equal(f.reads.length, 1, 'opening tray does not reload/reset location')
    const area = f.areas[0]
    area.mapped = true; area.signals.map(); await flush()
    area.signals.draw(area, drawContext)
    assert.ok(f.labels.includes('7-DAY FORECAST'))
    assert.ok(f.labels.includes('20°') || f.labels.some(s => String(s).includes('CLEAR · 20°')))
    area.signals.destroy()
    assert.equal(f.run('areas.length'), 0)
})

test('market shortcut loads saved watchlists before the compact panel exists', async () => {
    const f = fixture('markets', { stocks: ['MY_STOCK'], crypto: ['my-coin'] }, [])
    f.run('openMarketsModal()')
    await flush()
    assert.equal(f.areas.length, 0)
    assert.deepEqual(JSON.parse(f.run('JSON.stringify(pins)')), { stocks: ['MY_STOCK'], crypto: ['my-coin'] })
    assert.equal(f.reads[0], '/fixture/user/markets.json')
    assert.ok(f.requests.some(args => args.at(-1).includes('MY_STOCK')))
    assert.ok(f.requests.some(args => args.at(-1).includes('my-coin')))
    f.modals.get('markets').close()
    const before = f.requests.length
    f.timers.find(t => t.ms === 60000).callback(); await flush()
    assert.equal(f.requests.length, before)
    f.run('MarketsPanel({})')
    assert.equal(f.reads.filter(p => p.endsWith('markets.json')).length, 1)
    const area = f.areas[0]
    area.signals.draw(area, drawContext)
    assert.ok(f.labels.includes('MARKET FEED'))
    area.signals.destroy()
    assert.equal(f.run('areas.length'), 0)
    f.run('openMarketsModal()'); await flush()
    const opened = f.requests.length
    f.timers.find(t => t.ms === 60000).callback(); await flush()
    assert.ok(f.requests.length > opened, 'expanded market polling survives compact-panel destruction')
})
