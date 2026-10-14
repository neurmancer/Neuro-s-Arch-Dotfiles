import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const context = vm.createContext({})
const source = readFileSync('components/modules/input-region.ts', 'utf8').replace(/^export /gm, '')
vm.runInContext(stripTypeScriptTypes(source) + '\nglobalThis.api = { polygonRects, clipRects, widgetInputRects }', context)
const { polygonRects, clipRects, widgetInputRects } = context.api
const plain = value => JSON.parse(JSON.stringify(value))
const contains = (rects, x, y) => rects.some(r => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)

test('angled outlines preserve click-through corners and scale in logical coordinates', () => {
    for (const scale of [0.75, 1, 1.5, 2]) {
        const width = Math.round(164 * scale), height = Math.round(36 * scale), cut = 14 * scale
        const left = polygonRects([[0, 0], [width - cut, 0], [width, cut], [width, height], [0, height]])
        const right = polygonRects([[0, cut], [cut, 0], [width, 0], [width, height], [0, height]])
        assert.ok(contains(left, 1, 1))
        assert.ok(!contains(left, width - 1, 1))
        assert.ok(contains(right, width - 2, 1))
        assert.ok(!contains(right, 1, 1))
        for (const outline of [left, right]) {
            assert.ok(contains(outline, width / 2, height - 1))
            assert.ok(!contains(outline, width / 2, height))
            assert.ok(outline.length < height, 'straight spans coalesce instead of one rectangle per pixel row')
            assert.ok(outline.every(r => Object.values(r).every(Number.isInteger)))
        }
        const peek = Math.round(6 * scale)
        const idle = clipRects(left.map(r => ({ ...r, y: r.y + height - peek })), { x: 0, y: 0, width, height })
        assert.ok(!contains(idle, width / 2, height - peek - 1))
        assert.ok(contains(idle, width / 2, height - 1))
    }
})

const widget = (x, y, width, height, children) => ({
    get_visible: () => true, get_mapped: () => true,
    translate_coordinates: () => [true, x, y],
    get_allocated_width: () => width, get_allocated_height: () => height,
    ...(children ? { get_children: () => children } : {}),
    draw() { throw Error('input geometry must never render widgets') },
})

test('input regions clip sliding children, exclude empty containers, and ignore unmapped widgets', () => {
    const canvas = widget(20, -80, 100, 100)
    const revealer = widget(20, 0, 100, 20, [canvas])
    const tab = widget(70, 20, 50, 36)
    tab._hudInputRects = () => [{ x: 0, y: 30, width: 50, height: 6 }]
    const empty = widget(0, 0, 120, 1, [])
    const root = widget(0, 0, 120, 56, [revealer, tab, empty])
    assert.deepEqual(plain(widgetInputRects(root, {})), [
        { x: 20, y: 0, width: 100, height: 20 },
        { x: 70, y: 50, width: 50, height: 6 },
    ])
    canvas.get_mapped = () => false
    assert.equal(widgetInputRects(root, {}).length, 1)
    tab.get_visible = () => false
    assert.equal(widgetInputRects(root, {}).length, 0)
    tab.get_visible = () => true
    tab.translate_coordinates = () => [false, 0, 0]
    assert.equal(widgetInputRects(root, {}).length, 0)
})

test('HUD input avoids rendering, caches unchanged geometry, and subtracts overlaps only on the bottom layer', () => {
    const applied = [], draws = []
    class Region {
        rects = []; subtractions = []
        unionRectangle(rect) { this.rects.push(rect) }
        subtractRectangle(rect) { this.subtractions.push(rect) }
    }
    const canvas = widget(0, 0, 100, 36)
    canvas._hudInputRects = () => [{ x: 0, y: 30, width: 100, height: 6 }]
    const win = {
        _hudRoot: canvas, anchor: 10,
        get_mapped: () => true,
        get_window: () => ({ input_shape_combine_region: region => applied.push(region) }),
        get_allocated_width: () => 100, get_allocated_height: () => 36,
        draw: () => draws.push(true),
    }
    const ctx = vm.createContext({
        widgetInputRects, Cairo: { Region }, win,
        SCREEN_WIDTH: 1000, SCREEN_HEIGHT: 600,
        Anchor: { LEFT: 1, RIGHT: 2, TOP: 4, BOTTOM: 8 },
        print: (...args) => { throw Error(args.join(' ')) },
    })
    const core = readFileSync('core.ts', 'utf8')
    vm.runInContext(stripTypeScriptTypes('let hudOnTop = false;\n' +
        core.slice(core.indexOf('let winCache:'), core.indexOf('const applyHudInputAll'))), ctx)
    const run = code => vm.runInContext(code, ctx)
    run('applyHudInput(win); applyHudInput(win)')
    assert.equal(applied.length, 1)
    assert.deepEqual(plain(applied[0].rects), [{ x: 0, y: 30, width: 100, height: 6 }])
    run('winCache = [{ x: 950, y: 590, w: 100, h: 100 }]; winKey = "overlap"; applyHudInput(win)')
    assert.deepEqual(plain(applied.at(-1).subtractions), [{ x: 50, y: 26, width: 50, height: 10 }])
    run('hudOnTop = true; applyHudInput(win)')
    assert.deepEqual(applied.at(-1).subtractions, [])
    assert.deepEqual(plain(applied.at(-1).rects), [{ x: 0, y: 30, width: 100, height: 6 }], 'top layer also excludes hidden parts')
    win.get_mapped = () => false
    run('win._inputKey = null; applyHudInput(win)')
    assert.equal(applied.length, 3)
    assert.deepEqual(draws, [])
    win.anchor = 2
    assert.deepEqual(plain(run('surfaceRect(win)')), { x: 900, y: 282, w: 100, h: 36 },
        'a right-only anchor centers the tray vertically for overlap subtraction')
})
