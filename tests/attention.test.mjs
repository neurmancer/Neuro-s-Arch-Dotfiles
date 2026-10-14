import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

function fixture() {
    let now = 1_000_000, animated = true, glow = 'normal', next = 1
    const ticks = new Map(), listeners = new Set()
    const area = {
        mapped: true, redraws: 0,
        get_mapped() { return this.mapped }, queue_draw() { this.redraws++ },
        add_tick_callback(cb) { const id = next++; ticks.set(id, cb); return id },
        remove_tick_callback(id) { ticks.delete(id) },
    }
    const context = vm.createContext({
        GLib: { get_monotonic_time: () => now }, animOn: () => animated, cfgStr: () => glow,
        onConfigChange: cb => { listeners.add(cb); return () => listeners.delete(cb) },
    })
    const colors = readFileSync('components/modules/colors.ts', 'utf8')
    // Load all six real palettes, including NSD's separately declared source.
    const source = colors.slice(colors.indexOf('export const NEON:'), colors.indexOf('export const USER:'))
    const attention = readFileSync('components/modules/attention.ts', 'utf8').replace(/^import .*\n/gm, '')
    vm.runInContext(stripTypeScriptTypes((source + '\n' + attention).replace(/^export /gm, '')) +
        '\nglobalThis.api = { createAttention, drawAttentionEdge, traceAttentionEdge, attentionColors, NEON, PALETTES }', context)
    return { ...context.api, area, ticks, listeners,
        frame(ms) { now += ms * 1000; for (const [id, cb] of [...ticks]) if (!cb(null, { get_frame_time: () => now })) ticks.delete(id) },
        configure(motion, intensity = glow) { animated = motion; glow = intensity; for (const cb of listeners) cb() },
    }
}

test('takeover reverses smoothly, preserves keyboard focus, and stops all idle work', () => {
    const f = fixture(), a = f.createAttention(f.area)
    a.set({ hovered: true }); f.frame(40)
    assert.ok(a.value > 0 && a.value < 1)
    const value = a.value, tick = [...f.ticks.keys()][0]
    a.set({ hovered: true }); assert.ok(f.ticks.has(tick), 'duplicate crossing does not restart')
    a.set({ hovered: false }); assert.equal(a.value, value, 'reversing starts from the displayed state')
    f.frame(200); assert.equal(a.value, 0); assert.equal(f.ticks.size, 0)
    a.set({ focused: true }); f.frame(200)
    a.set({ hovered: true }); a.set({ hovered: false })
    assert.equal(a.value, 1); assert.equal(a.focused, true); assert.equal(f.ticks.size, 0)
    a.set({ focused: false, selected: true }); assert.equal(a.value, 1)
    a.set({ selected: false }); f.frame(200)
    const draws = f.area.redraws; f.frame(5000)
    assert.equal(f.area.redraws, draws, 'settled states do not redraw')
    a.dispose(); assert.equal(f.listeners.size, 0)
})

test('reduced motion, hiding, and destruction settle without losing focus feedback', () => {
    const f = fixture(), a = f.createAttention(f.area)
    a.set({ focused: true }); f.frame(20); f.configure(false)
    assert.equal(a.value, 1); assert.equal(a.focused, true); assert.equal(f.ticks.size, 0)
    a.set({ focused: false }); assert.equal(a.value, 0)
    f.configure(true); a.set({ hovered: true }); a.reset()
    assert.equal(a.value, 0); assert.equal(f.ticks.size, 0)
    f.area.mapped = false; a.set({ selected: true })
    assert.equal(a.value, 1); assert.equal(f.ticks.size, 0)
    f.area.mapped = true; a.set({ selected: false }); assert.equal(f.ticks.size, 1)
    a.dispose(); assert.equal(f.ticks.size, 0); assert.equal(f.listeners.size, 0)
    a.set({ hovered: true }); assert.equal(f.ticks.size, 0)
})

test('secondary accent travels around geometry; no-glow focus still has a shape cue', () => {
    const f = fixture(), paths = [], strokes = []
    let current = [], color, width
    const ctx = {
        save() {}, restore() {}, newPath() { current = []; paths.push(current) },
        moveTo: (x, y) => current.push([x, y]), lineTo: (x, y) => current.push([x, y]), closePath() {},
        setSourceRGBA(...rgba) { assert.ok(rgba.every(Number.isFinite)); color = rgba },
        setLineWidth(v) { width = v }, stroke() { strokes.push({ color, width, path: current }) },
    }
    const points = [[0, 0], [100, 0], [100, 50], [0, 50]]
    f.traceAttentionEdge(ctx, points, 0.5)
    assert.deepEqual(paths.at(-1), [[0, 0], [100, 0], [100, 50]])
    f.configure(false, 'off')
    f.drawAttentionEdge(ctx, points, 1, true)
    assert.equal(strokes.length, 3, 'primary edge, secondary edge, and separate focus corner; no halos')
    assert.equal(strokes.at(-1).width, 2)
    assert.deepEqual(strokes.at(-1).path, [[5, 15], [5, 5], [19, 5]])
    f.NEON.press = [...f.NEON.dock]
    strokes.length = 0; f.drawAttentionEdge(ctx, points, 1, true)
    assert.equal(strokes.length, 3, 'focus shape survives equal accents')
    f.NEON.press = [0, 235, 116]
    strokes.length = 0; f.configure(true, 'strong'); f.drawAttentionEdge(ctx, points, 0.5)
    assert.deepEqual(strokes.at(-1).color.slice(0, 3), [0, 235 / 255, 116 / 255], 'palette edits resolve at draw time')
    assert.deepEqual(strokes.at(-1).path, [[0, 0], [100, 0], [100, 50]])
})

test('all six palettes provide live finite primary and secondary accents', () => {
    const f = fixture()
    assert.equal(Object.keys(f.PALETTES).length, 6)
    for (const palette of Object.values(f.PALETTES)) {
        Object.assign(f.NEON, palette)
        const { primary, secondary } = f.attentionColors()
        assert.ok([...primary, ...secondary].every(v => Number.isFinite(v) && v >= 0 && v <= 1))
        assert.deepEqual(Array.from(primary), Array.from(palette.dock, v => v / 255))
        assert.deepEqual(Array.from(secondary), Array.from(palette.press, v => v / 255))
    }
})
