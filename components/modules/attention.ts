import GLib from "gi://GLib"
import { NEON } from "./colors.ts"
import { animOn, cfgStr, onConfigChange } from "./config.ts"

// Semantic accents use the existing editable primary/pressed palette slots.
// Resolve at draw time so palette changes never leave a captured stale color.
export const attentionColors = () => ({
    primary: NEON.dock.map(v => v / 255),
    secondary: NEON.press.map(v => v / 255),
})
export const attentionGlow = () => ({ off: 0, low: 0.35, normal: 0.7, strong: 1.2 }[cfgStr("interactionGlow")] ?? 0.7)

export type AttentionState = { hovered: boolean; focused: boolean; selected: boolean }
export const createAttention = (area: any, motionEnabled = () => true) => {
    const state: AttentionState = { hovered: false, focused: false, selected: false }
    let value = 0, target = 0, tick = 0, disposed = false
    const stop = () => { if (tick) { area.remove_tick_callback(tick); tick = 0 } }
    const update = () => {
        if (disposed) return
        const next = state.hovered || state.focused || state.selected ? 1 : 0
        if (next === target && tick && animOn("animInteraction") && motionEnabled() && area.get_mapped()) return
        stop(); target = next
        if (!animOn("animInteraction") || !motionEnabled() || !area.get_mapped() || value === target) {
            value = target; area.queue_draw(); return
        }
        const from = value, start = GLib.get_monotonic_time()
        const duration = (target ? 180_000 : 160_000) * Math.abs(target - from)
        tick = area.add_tick_callback((_widget, clock) => {
            const t = Math.min(1, Math.max(0, (clock.get_frame_time() - start) / duration))
            value = from + (target - from) * (1 - (1 - t) ** 3)
            area.queue_draw()
            if (t < 1) return true
            value = target; tick = 0; return false
        })
        area.queue_draw()
    }
    const offConfig = onConfigChange(() => { update(); area.queue_draw() })
    return {
        get value() { return value },
        get focused() { return state.focused },
        refresh: update,
        set(patch: Partial<AttentionState>) {
            if (disposed) return
            if (Object.keys(patch).every(key => state[key] === patch[key])) return
            Object.assign(state, patch); update(); area.queue_draw()
        },
        reset() {
            stop(); state.hovered = state.focused = state.selected = false
            value = target = 0; if (!disposed) area.queue_draw()
        },
        dispose() { if (disposed) return; stop(); offConfig(); disposed = true },
    }
}

// Walk clockwise from the first corner. A partial path lets the secondary
// accent advance through structure instead of tinting the entire surface.
export const traceAttentionEdge = (ctx: any, points: number[][], amount: number) => {
    ctx.newPath()
    if (!points.length) return
    const lengths = points.map((p, i) => {
        const q = points[(i + 1) % points.length]
        return Math.hypot(q[0] - p[0], q[1] - p[1])
    })
    let remaining = lengths.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, amount))
    ctx.moveTo(...points[0])
    for (let i = 0; i < points.length && remaining > 0; i++) {
        const p = points[i], q = points[(i + 1) % points.length], length = lengths[i]
        if (!length) continue
        const t = Math.min(1, remaining / length)
        ctx.lineTo(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
        remaining -= length
    }
    if (amount >= 1) ctx.closePath()
}

export const drawAttentionEdge = (ctx: any, points: number[][], amount: number, focused = false, importance = 1, scale = 1, glowLevel = attentionGlow()) => {
    const { primary, secondary } = attentionColors()
    const progress = Math.max(0, Math.min(1, amount)), glow = glowLevel * importance
    ctx.save()
    const stroke = (color: number[], alpha: number, width: number, coverage: number) => {
        traceAttentionEdge(ctx, points, coverage)
        ctx.setSourceRGBA(...color, alpha); ctx.setLineWidth(width * scale); ctx.stroke()
    }
    // Bounded vector strokes, no blur surfaces, shaders, or pulse timers.
    if (glow > 0) stroke(primary, 0.035 * glow, 4, 1)
    stroke(primary, 0.55, 1, 1)
    if (progress > 0) {
        if (glow > 0) {
            stroke(secondary, 0.07 * glow, focused ? 9 : 6, progress)
            stroke(secondary, 0.16 * glow, focused ? 5 : 3, progress)
        }
        stroke(secondary, 0.95, focused ? 2 : 1.4, progress)
    }
    // A second inset corner remains visible with glow off or identical accents.
    if (focused && points.length) {
        const [x, y] = points[0]
        ctx.newPath(); ctx.moveTo(x + 5 * scale, y + 15 * scale)
        ctx.lineTo(x + 5 * scale, y + 5 * scale); ctx.lineTo(x + 19 * scale, y + 5 * scale)
        ctx.setSourceRGBA(...secondary, 1); ctx.setLineWidth(2 * scale); ctx.stroke()
    }
    ctx.restore()
}
