import Gdk from "gi://Gdk?version=3.0"
import { Window, Box, Button, Label, DrawingArea, Layer, Keymode, Exclusivity, activeMonitor } from "./widget.ts"
import { createAttention, drawAttentionEdge, traceAttentionEdge, attentionColors, attentionGlow } from "./attention.ts"
import { NEON, onColorChange } from "./colors.ts"
import { MONO } from "./fonts.ts"

let prototypeWindow: any = null

const createPrototype = () => {
    let motion = true, glowIndex = 0
    const glowModes = ["Theme", "Off", "Low", "Normal", "Strong"]
    const glowValues = [undefined, 0, 0.35, 0.7, 1.2]
    const samples: Array<{ area: any; attention: ReturnType<typeof createAttention> }> = []
    const status = Label({ label: "Hover a panel, Tab to focus, or press Enter to select." })
    const sample = (title: string, points: number[][]) => {
        let selected = false
        const area = DrawingArea({ widthRequest: 240, heightRequest: 172 })
        const attention = createAttention(area, () => motion)
        samples.push({ area, attention })
        const button = Button({
            className: "util-tray-tab",
            child: area,
            onClicked: () => {
                selected = !selected
                attention.set({ selected })
                status.label = `${title}: ${selected ? "selected" : "released"}`
            },
        })
        button.get_accessible()?.set_name(`${title} — toggle sample selection`)
        area.connect("draw", (_widget, ctx) => {
            const { primary, secondary } = attentionColors()
            traceAttentionEdge(ctx, points, 1)
            ctx.setSourceRGBA(...NEON.modalbg.map(value => value / 255), 0.98)
            ctx.fill()
            drawAttentionEdge(ctx, points, attention.value, attention.focused, 1, 1, glowValues[glowIndex] ?? attentionGlow())
            const text = (label: string, top: number, color: number[], size = 12) => {
                ctx.selectFontFace(MONO, 0, 0)
                ctx.setFontSize(size)
                ctx.setSourceRGBA(...color, 1)
                ctx.moveTo(28, top)
                ctx.showText(label)
            }
            text(title, 42, primary)
            text("SAMPLE / 64%", 75, [0.9, 0.93, 0.95], 15)
            for (let segment = 0; segment < 20; segment++) {
                ctx.setSourceRGBA(...primary, segment < 13 ? 0.9 : 0.16)
                ctx.rectangle(28 + segment * 9, 91, 6, 12)
                ctx.fill()
            }
            text(selected ? "[x] SELECTED" : "[ ] SELECT", 133, selected ? secondary : primary)
            if (attention.focused) text("FOCUS", 151, [0.9, 0.93, 0.95], 10)
            return false
        })
        button.add_events(Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
        button.connect("enter-notify-event", (_widget, event) => {
            if (event.detail !== Gdk.NotifyType.INFERIOR) attention.set({ hovered: true })
            return false
        })
        button.connect("leave-notify-event", (_widget, event) => {
            if (event.detail !== Gdk.NotifyType.INFERIOR) attention.set({ hovered: false })
            return false
        })
        button.connect("notify::has-focus", () => attention.set({ focused: !!button.has_focus }))
        area.connect("unmap", () => { selected = false; attention.reset() })
        const offColor = onColorChange(() => area.queue_draw())
        area.connect("destroy", () => { offColor(); attention.dispose() })
        return button
    }
    const glowButton = Button({ label: "Glow: Theme", onClicked: () => {
        glowIndex = (glowIndex + 1) % glowModes.length
        glowButton.label = `Glow: ${glowModes[glowIndex]}`
        samples.forEach(({ area }) => area.queue_draw())
    } })
    const motionButton = Button({ label: "Motion: Theme", onClicked: () => {
        motion = !motion
        motionButton.label = motion ? "Motion: Theme" : "Motion: Off"
        samples.forEach(({ attention }) => attention.refresh())
    } })
    const window = Window({
        name: "design-prototype",
        title: "NeurOS design experiments",
        layer: Layer.OVERLAY,
        keymode: Keymode.EXCLUSIVE,
        exclusivity: Exclusivity.IGNORE,
        visible: false,
        child: Box({ vertical: true, spacing: 16, css: "padding: 24px; background: #10131b; color: #edf0f5;", children: [
            Label({ label: "NeurOS / Geometry & Attention", xalign: 0 }),
            Label({ label: "Concept studies · illustrative data · current theme accents", xalign: 0 }),
            Box({ spacing: 12, children: [
                sample("A / INSTRUMENT", [[12, 12], [216, 12], [228, 24], [228, 144], [212, 160], [12, 160]]),
                sample("B / TECHNICAL", [[20, 12], [228, 12], [228, 148], [216, 160], [12, 160], [12, 20]]),
                sample("D / FACETED", [[28, 12], [212, 12], [228, 28], [228, 144], [212, 160], [28, 160], [12, 144], [12, 28]]),
            ] }),
            status,
            Box({ spacing: 12, children: [glowButton, motionButton, Button({ label: "Close", onClicked: () => window.destroy() })] }),
            Label({ label: "Tab / Shift+Tab: focus · Enter / Space: select · Esc: close", xalign: 0 }),
        ] }),
    })
    window.connect("key-press-event", (_widget, event) => {
        if (event.get_keyval()[1] !== Gdk.KEY_Escape) return false
        window.destroy()
        return true
    })
    window.connect("destroy", () => { prototypeWindow = null })
    return window
}

export const toggleDesignPrototype = () => {
    if (prototypeWindow) { prototypeWindow.destroy(); return }
    prototypeWindow = createPrototype()
    prototypeWindow.gdkmonitor = activeMonitor()
    prototypeWindow.show_all()
}
