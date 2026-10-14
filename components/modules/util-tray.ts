import { Box, Button, DrawingArea, EventBox, Revealer, activeMonitor } from "./widget.ts"
import Gtk from "gi://Gtk?version=3.0"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import { polygonRects, clipRects } from "./input-region.ts"
import { scaleOf } from "../../env.ts"
import { NEON, onColorChange } from "./colors.ts"
import { animOn, onConfigChange } from "./config.ts"
import { TITLE, MONO } from "./fonts.ts"

type TrayOptions = {
    label: string
    side?: "left" | "right"
    edge?: "bottom" | "right" | "top"
    code?: string
    caption?: string
    width?: number
    content: (monitor: any) => any
}

export const createUtilTray = (options: TrayOptions) => {
    const trays = new Map<any, { toggle: () => boolean }>()
    const toggle = (): boolean => {
        const tray = trays.get(activeMonitor()) || trays.values().next().value
        return tray?.toggle() ?? false
    }
    const create = (mon: any) => {
        let expanded = false
        let hovered = false
        let tabTick = 0
        let content: any = null
        const scale = scaleOf(mon)
        const rightEdge = options.edge === "right"
        const topEdge = options.edge === "top"
        const peekHeight = Math.max(5, Math.round(6 * scale))
        const fullHeight = Math.max(peekHeight, Math.round(44 * scale))
        const width = Math.round((options.width || 204) * scale)
        const faceWidth = rightEdge ? fullHeight : width
        const faceHeight = rightEdge ? width : fullHeight
        let tabHeight = peekHeight
        let tabTarget = peekHeight
        let fullInput = false
        const body = Revealer({
            revealChild: false,
            transitionType: rightEdge ? Gtk.RevealerTransitionType.SLIDE_LEFT
                : topEdge ? Gtk.RevealerTransitionType.SLIDE_DOWN : Gtk.RevealerTransitionType.SLIDE_UP,
        })
        const face = DrawingArea({
            widthRequest: faceWidth,
            heightRequest: faceHeight,
        })
        face.connect("draw", (_w, ctx) => {
            const w = width, h = fullHeight
            ctx.save()
            // Move paint within a fixed allocation: hover never resizes the window.
            ctx.rectangle(0, 0, faceWidth, faceHeight); ctx.clip()
            if (rightEdge) {
                ctx.translate(fullHeight - tabHeight, width)
                ctx.rotate(-Math.PI / 2)
            } else ctx.translate(0, (topEdge ? -1 : 1) * (fullHeight - tabHeight))
            const cut = Math.min(14 * scale, h / 2)
            const path = () => {
                if (topEdge) {
                    ctx.moveTo(0, 0); ctx.lineTo(w - 0.5, 0)
                    ctx.lineTo(w - 0.5, h - cut); ctx.lineTo(w - cut, h - 0.5); ctx.lineTo(0, h - 0.5)
                } else if (options.side === "right" && !rightEdge) {
                    ctx.moveTo(0.5, cut); ctx.lineTo(cut, 0.5)
                    ctx.lineTo(w, 0.5); ctx.lineTo(w, h); ctx.lineTo(0.5, h)
                } else {
                    ctx.moveTo(0, 0.5); ctx.lineTo(w - cut, 0.5)
                    ctx.lineTo(w - 0.5, cut); ctx.lineTo(w - 0.5, h); ctx.lineTo(0, h)
                }
                ctx.closePath()
            }
            const ink = (alpha = 1) => ctx.setSourceRGBA(...NEON.dock.map(v => v / 255), alpha)
            path()
            ctx.setSourceRGBA(...NEON.modalbg.map((v, i) => (v * 0.94 + NEON.dock[i] * 0.06) / 255), 0.98); ctx.fill()
            // All detailing is static vector paint; no blur, texture or pulse timers.
            path()
            ink(hovered || expanded ? 0.95 : 0.65)
            ctx.setLineWidth(Math.max(1, scale)); ctx.stroke()
            ink(0.12); ctx.rectangle(0, 0, 33 * scale, h); ctx.fill()
            ink(0.8); ctx.rectangle(0, 0, 30 * scale, 3 * scale); ctx.fill()
            ink(0.3)
            ctx.moveTo(33 * scale, 9 * scale); ctx.lineTo(33 * scale, h - 8 * scale)
            ctx.moveTo(42 * scale, h - 5 * scale); ctx.lineTo(w - 40 * scale, h - 5 * scale)
            ctx.stroke()
            ctx.selectFontFace(MONO, 0, 0)
            ctx.setFontSize(Math.max(8, 10 * scale)); ink(0.85)
            ctx.moveTo(8 * scale, 25 * scale); ctx.showText(options.code || "//")
            ctx.selectFontFace(TITLE, 0, 1)
            ctx.setFontSize(Math.max(9, 12 * scale))
            ink(1); ctx.moveTo(43 * scale, 20 * scale); ctx.showText(options.label)
            ctx.selectFontFace(MONO, 0, 0)
            ctx.setFontSize(Math.max(7, 8 * scale)); ink(0.58)
            ctx.moveTo(43 * scale, 32 * scale); ctx.showText(options.caption || "UTILITY ACCESS")
            // A physical latch indicator distinguishes open, hover and idle states.
            const latchX = w - 20 * scale, latchY = 23 * scale
            ink(expanded || hovered ? 1 : 0.5)
            ctx.setLineWidth(Math.max(1, 1.5 * scale))
            ctx.moveTo(latchX - 4 * scale, latchY); ctx.lineTo(latchX + 4 * scale, latchY)
            if (!expanded) { ctx.moveTo(latchX, latchY - 4 * scale); ctx.lineTo(latchX, latchY + 4 * scale) }
            ctx.stroke()
            for (let i = 0; i < 3; i++) {
                ink(expanded || i === 0 ? 0.9 : 0.2)
                ctx.rectangle(w - (30 - i * 5) * scale, h - 6 * scale, 3 * scale, 2 * scale); ctx.fill()
            }
            if (tab.has_focus) {
                ink(0.85); ctx.rectangle(3 * scale, 6 * scale, 2 * scale, h - 12 * scale); ctx.fill()
            }
            ctx.restore()
            return false
        })
        const cut = Math.min(14 * scale, fullHeight / 2)
        const points = topEdge
            ? [[0, 0], [width, 0], [width, fullHeight - cut], [width - cut, fullHeight], [0, fullHeight]]
            : options.side === "right" && !rightEdge
            ? [[0, cut], [cut, 0], [width, 0], [width, fullHeight], [0, fullHeight]]
            : [[0, 0], [width - cut, 0], [width, cut], [width, fullHeight], [0, fullHeight]]
        const tabOutline = polygonRects(rightEdge ? points.map(([x, y]) => [y, width - x]) : points)
        const peekOutline = clipRects(tabOutline.map(r => ({ ...r,
            x: r.x + (rightEdge ? fullHeight - peekHeight : 0),
            y: r.y + (rightEdge ? 0 : (topEdge ? -1 : 1) * (fullHeight - peekHeight)),
        })), { x: 0, y: 0, width: faceWidth, height: faceHeight })
        face._hudInputRects = () => fullInput ? tabOutline : peekOutline
        const setFullInput = (value: boolean) => {
            if (fullInput === value) return
            fullInput = value
            root._onHudInputChanged?.()
        }
        const stopTick = () => {
            if (tabTick) { face.remove_tick_callback(tabTick); tabTick = 0 }
        }
        const updateTab = (animate = true) => {
            const target = hovered || expanded ? fullHeight : peekHeight
            const moving = animate && animOn("animModal") && face.get_mapped()
            // Duplicate crossing events must not restart an in-flight animation.
            if (moving && target === tabTarget && tabTick) return
            stopTick()
            tabTarget = target
            if (!moving || tabHeight === target) {
                tabHeight = target
                setFullInput(target === fullHeight)
                face.queue_draw()
                return
            }
            // Keep a stable hover target until retraction finishes. The idle
            // surface passes clicks through everywhere except the edge peek.
            setFullInput(true)
            const from = tabHeight
            const start = GLib.get_monotonic_time()
            const duration = 120_000 * Math.abs(target - from) / (fullHeight - peekHeight)
            tabTick = face.add_tick_callback((_widget, clock) => {
                const progress = Math.min(1, Math.max(0, (clock.get_frame_time() - start) / duration))
                tabHeight = from + (target - from) * (1 - (1 - progress) ** 3)
                face.queue_draw()
                if (progress < 1) return true
                tabTick = 0
                setFullInput(target === fullHeight)
                return false
            })
        }
        const tab = Button({
            className: "util-tray-tab",
            halign: options.side === "right" ? Gtk.Align.END : Gtk.Align.START,
            valign: rightEdge ? Gtk.Align.CENTER : topEdge ? Gtk.Align.START : Gtk.Align.END,
            child: face,
            onClicked: () => toggle(),
        })
        tab.connect("notify::has-focus", () => face.queue_draw())
        tab.get_accessible()?.set_name(`${options.label} tray`)
        const panel = Box({ vertical: !rightEdge, children: topEdge ? [tab, body] : [body, tab] })
        const root = EventBox({ className: "util-tray", child: panel })
        const setExpanded = (open: boolean) => {
            if (expanded === open) return expanded
            expanded = open
            if (open && !content) {
                content = options.content(mon)
                body.add(content)
                content.show_all()
                content.no_show_all = true
            }
            if (open) content.visible = true
            body.reveal_child = open
            // With animations disabled, GTK can complete before the notify handler.
            if (!open && !body.child_revealed && content) content.visible = false
            updateTab()
            face.queue_draw()
            root._onHudInputChanged?.()
            return expanded
        }
        const toggle = () => setExpanded(!expanded)
        body.connect("notify::child-revealed", () => {
            if (!expanded && !body.child_revealed && content) content.visible = false
            root._onHudInputChanged?.()
        })
        root.add_events(Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
        root.connect("enter-notify-event", (_w, event) => {
            if (event.detail !== Gdk.NotifyType.INFERIOR && !hovered) {
                hovered = true; updateTab()
            }
            return false
        })
        root.connect("leave-notify-event", (_w, event) => {
            // Moving between the tab and its controls is still inside the tray.
            if (event.detail !== Gdk.NotifyType.INFERIOR && hovered) {
                hovered = false; updateTab()
            }
            return false
        })
        root.connect("unmap", () => { hovered = false; setExpanded(false); updateTab(false) })
        const motion = () => {
            body.transition_duration = animOn("animModal") ? 180 : 0
            updateTab(false)
        }
        motion()
        const offConfig = onConfigChange(motion)
        const unsubscribe = onColorChange(() => face.queue_draw())
        const controller = { toggle }
        trays.set(mon, controller)
        root.connect("destroy", () => {
            stopTick()
            root._onHudInputChanged = null
            unsubscribe()
            offConfig()
            if (trays.get(mon) === controller) trays.delete(mon)
        })
        return root
    }

    return { create, toggle }
}
