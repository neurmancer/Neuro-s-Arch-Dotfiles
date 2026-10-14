import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const source = name => readFileSync(`components/modules/${name}.ts`, 'utf8')
    .replace(/^import .*\n/gm, '').replace(/^export /gm, '')
function fixture() {
    const files = { '/proc/stat': 'cpu 10 0 20 70 0 0 0 0 8 0\n', '/proc/meminfo': 'MemTotal: 8388608 kB\nMemAvailable: 6291456 kB\n' }
    const timers = new Map(), reads = [], areas = [], colorListeners = new Set(), opened = []
    let next = 1
    const widget = props => ({
        ...props, signals: {}, mapped: false, redraws: 0,
        connect(signal, cb) { this.signals[signal] = cb },
        queue_draw() { this.redraws++ },
        add_events() {}, get_mapped() { return this.mapped },
        get_accessible() { return { set_name() {} } },
    })
    const ctx = vm.createContext({
        TextDecoder, TextEncoder, print: () => {},
        GLib: {
            PRIORITY_DEFAULT: 0, SOURCE_CONTINUE: true,
            file_get_contents(path) { reads.push(path); return [true, new TextEncoder().encode(files[path] || '')] },
            timeout_add_seconds(_priority, seconds, callback) { assert.equal(seconds, 1); const id = next++; timers.set(id, callback); return id },
            source_remove: id => timers.delete(id),
        },
        Button: widget, DrawingArea: props => { const w = widget(props); areas.push(w); return w },
        animOn: () => false, cfgStr: () => 'off', onConfigChange: () => () => {},
        Gdk: { EventMask: { ENTER_NOTIFY_MASK: 1, LEAVE_NOTIFY_MASK: 2 }, NotifyType: { INFERIOR: 2 } },
        scaleOf: () => 1, TITLE: 'Quantico', MONO: 'Tektur',
        onColorChange: cb => { colorListeners.add(cb); return () => colorListeners.delete(cb) },
        toggleModal: name => opened.push(name),
    })
    const colors = readFileSync('components/modules/colors.ts', 'utf8')
    vm.runInContext(stripTypeScriptTypes(colors.slice(colors.indexOf('export const NEON:'), colors.indexOf('export type PaletteName')).replace(/^export /gm, '')), ctx)
    vm.runInContext(stripTypeScriptTypes(['attention', 'input-region', 'system-stats', 'system-panel'].map(source).join('\n')) +
        '\nglobalThis.api = { parseCpuSample, cpuFraction, parseMemorySample, SystemPanel }', ctx)
    return { ...ctx.api, files, timers, reads, areas, colorListeners, opened }
}

test('CPU uses counter deltas without double counting guest time; RAM uses available memory', () => {
    const f = fixture(), p = f.parseCpuSample
    const before = p('cpu 10 0 20 70 0 0 0 0 8 0\ncpu0 1 0 1 4\n')
    const after = p('cpu 30 0 30 110 10 0 0 20 25 0\n')
    assert.equal(before.total, 100)
    assert.equal(f.cpuFraction(before, after), 0.5)
    assert.equal(f.cpuFraction(null, after), null)
    assert.equal(f.cpuFraction(after, before), null)
    assert.equal(f.cpuFraction(before, before), null)
    assert.equal(p('cpu 1 nope 3 4'), null)
    assert.equal(p(''), null)
    const memory = f.parseMemorySample(f.files['/proc/meminfo'])
    assert.equal(memory.used, 2097152)
    assert.equal(memory.total, 8388608)
    assert.equal(f.parseMemorySample('MemTotal: 0 kB\nMemAvailable: 0 kB'), null)
    assert.equal(f.parseMemorySample('MemTotal: 42 kB'), null)
    assert.equal(f.parseMemorySample('MemTotal: 42 kB\nMemAvailable: 50 kB').used, 0)
})

test('visible panels share one sampler; unmapping or destroying the last panel stops it', () => {
    const f = fixture(), a = f.SystemPanel({}), b = f.SystemPanel({})
    const [left, right] = f.areas
    const labels = []
    const cairo = new Proxy({ textExtents: label => ({ width: label.length * 5 }), showText: label => labels.push(label) }, { get: (o, k) => o[k] || (() => {}) })
    assert.equal(f.reads.length, 0, 'construction does not poll')
    left.signals.map()
    assert.equal(f.timers.size, 1)
    assert.equal(f.reads.length, 2)
    right.signals.map()
    assert.equal(f.timers.size, 1)
    assert.equal(f.reads.length, 2, 'another monitor reuses the current sample')
    left.signals.draw(left, cairo)
    assert.ok(labels.includes('AWAITING SAMPLE'))
    assert.ok(labels.includes('2.0 / 8.0 GiB IN USE'))
    f.files['/proc/stat'] = 'cpu 30 0 30 110 10 0 0 20 25 0\n'
    f.timers.values().next().value()
    labels.length = 0; left.signals.draw(left, cairo)
    assert.ok(labels.includes('50%'))
    a.onClicked(); b.onClicked()
    assert.deepEqual(f.opened, ['sys', 'sys'])
    left.signals.unmap()
    assert.equal(f.timers.size, 1)
    right.signals.unmap()
    assert.equal(f.timers.size, 0)
    left.signals.map()
    labels.length = 0; left.signals.draw(left, cairo)
    assert.ok(labels.includes('AWAITING SAMPLE'), 'reopening starts a fresh CPU interval')
    f.files['/proc/stat'] = ''; f.files['/proc/meminfo'] = ''
    f.timers.values().next().value()
    labels.length = 0; left.signals.draw(left, cairo)
    assert.ok(labels.includes('MEMORY UNAVAILABLE'))
    left.signals.destroy(); right.signals.destroy()
    assert.equal(f.timers.size, 0)
    assert.equal(f.colorListeners.size, 0)
})
