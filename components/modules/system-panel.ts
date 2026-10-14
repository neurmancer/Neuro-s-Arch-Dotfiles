import { Button, DrawingArea } from "./widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { createAttention, drawAttentionEdge, attentionColors } from "./attention.ts"
import { scaleOf } from "../../env.ts"
import { NEON, onColorChange } from "./colors.ts"
import { TITLE, MONO } from "./fonts.ts"
import { toggleModal } from "./cmodal.ts"
import { polygonRects } from "./input-region.ts"
import { subscribeSystemStats, SystemSample } from "./system-stats.ts"

const W = 360, H = 156
export const SystemPanel = (mon: any) => {
    const scale = scaleOf(mon)
    let state: SystemSample = { cpu: null, memory: null }
    let unsubscribe: (() => void) | null = null
    const points = [[0, 0], [W, 0], [W, H - 14], [W - 14, H], [0, H]]
    const outline = polygonRects(points.map(p => p.map(n => n * scale)))
    const area = DrawingArea({ widthRequest: Math.round(W * scale), heightRequest: Math.round(H * scale) })
    area._hudInputRects = () => outline
    const attention = createAttention(area)
    const button = Button({ className: "util-tray-tab", child: area, onClicked: () => toggleModal("sys") })
    button.get_accessible()?.set_name("CPU and RAM usage — open system monitor")
    area.connect("draw", (_widget, ctx) => {
        ctx.save(); ctx.scale(scale, scale)
        const ink = (color: number[], alpha = 1) => ctx.setSourceRGBA(...color.map(v => v / 255), alpha)
        const path = () => {
            ctx.moveTo(0, 0)
            for (const [x, y] of points.slice(1)) ctx.lineTo(x, y)
            ctx.closePath()
        }
        path(); ink(NEON.modalbg, 0.97); ctx.fill()
        drawAttentionEdge(ctx, points, attention.value, attention.focused)
        ctx.setLineWidth(1)
        const text = (label: string, x: number, y: number, size: number, color: number[], alpha = 1, right = false) => {
            ctx.selectFontFace(size >= 12 ? TITLE : MONO, 0, size >= 12 ? 1 : 0)
            ctx.setFontSize(size); ink(color, alpha)
            ctx.moveTo(right ? x - ctx.textExtents(label).width : x, y); ctx.showText(label)
        }
        text("HOST / RESOURCES", 18, 17, 8, NEON.dock, 0.6)
        const row = (label: string, y: number, fraction: number | null, detail: string, color: number[]) => {
            text(label, 18, y, 13, color)
            text(fraction === null ? "--" : `${Math.round(fraction * 100)}%`, W - 18, y, 16, color, 1, true)
            const x = 18, barY = y + 9, length = W - 36, segments = 28, step = length / segments
            const bars = () => {
                for (let i = 0; i < segments; i++) {
                    const bx = x + i * step, bw = step - 2
                    ctx.moveTo(bx + 2, barY); ctx.lineTo(bx + bw, barY)
                    ctx.lineTo(bx + bw - 2, barY + 9); ctx.lineTo(bx, barY + 9); ctx.closePath()
                }
                ctx.fill()
            }
            ink(color, 0.14); bars()
            if (fraction !== null) {
                ctx.save(); ctx.rectangle(x, barY, length * fraction, 10); ctx.clip()
                ink(color, 0.95); bars(); ctx.restore()
            }
            text(detail, 18, y + 31, 8, color, 0.65)
        }
        row("CPU", 39, state.cpu, state.cpu === null ? "AWAITING SAMPLE" : "AGGREGATE PROCESSOR LOAD", NEON.dock)
        ink(NEON.dock, 0.18); ctx.moveTo(18, 79.5); ctx.lineTo(W - 18, 79.5); ctx.stroke()
        const memory = state.memory
        row("RAM", 96, memory ? memory.used / memory.total : null,
            memory ? `${(memory.used / 1048576).toFixed(1)} / ${(memory.total / 1048576).toFixed(1)} GiB IN USE` : "MEMORY UNAVAILABLE", NEON.green)
        const { primary, secondary } = attentionColors()
        const actionColor = primary.map((v, i) => (v + (secondary[i] - v) * attention.value) * 255)
        text("OPEN SYSTEM MONITOR", 18, H - 9, 7, actionColor, 0.55 + 0.4 * attention.value)
        ink(NEON.dock, 0.65)
        ctx.moveTo(W - 27, 12); ctx.lineTo(W - 18, 12); ctx.lineTo(W - 18, 21)
        ctx.moveTo(W - 18, 12); ctx.lineTo(W - 27, 21); ctx.stroke()
        ctx.restore()
        return false
    })
    const stop = () => { unsubscribe?.(); unsubscribe = null }
    area.connect("map", () => {
        if (!unsubscribe) unsubscribe = subscribeSystemStats(sample => { state = sample; area.queue_draw() })
    })
    area.connect("unmap", () => { stop(); attention.reset() })
    button.add_events(Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
    button.connect("enter-notify-event", (_w, event) => {
        if (event.detail !== Gdk.NotifyType.INFERIOR) attention.set({ hovered: true })
        return false
    })
    button.connect("leave-notify-event", (_w, event) => {
        if (event.detail !== Gdk.NotifyType.INFERIOR) attention.set({ hovered: false })
        return false
    })
    button.connect("notify::has-focus", () => attention.set({ focused: !!button.has_focus }))
    const offColor = onColorChange(() => area.queue_draw())
    area.connect("destroy", () => { stop(); offColor(); attention.dispose() })
    return button
}
