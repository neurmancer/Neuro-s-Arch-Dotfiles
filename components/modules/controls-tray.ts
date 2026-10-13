import { Box, Button, DrawingArea, EventBox, Revealer, activeMonitor } from "./widget.ts"
import Gtk from "gi://Gtk?version=3.0"
import Gdk from "gi://Gdk?version=3.0"
import { timeout } from "astal"
import { Toggles, HorizDock } from "./dock.ts"
import { scaleOf } from "../../env.ts"
import { NEON, onColorChange } from "./colors.ts"
import { animOn, onConfigChange } from "./config.ts"
import { TITLE } from "./fonts.ts"

const trays = new Map<any, { toggle: () => boolean }>()

// Each monitor has its own collapsed tray; utility windows remain independent.
export const toggleControlsTray = (): boolean => {
    const tray = trays.get(activeMonitor()) || trays.values().next().value
    return tray?.toggle() ?? false
}

export const ControlsTray = (mon: any) => {
    let expanded = false
    let hovered = false
    let tabTimer: any = null
    let content: any = null
    let leaveTimer: any = null
    const scale = scaleOf(mon)
    const peekHeight = Math.max(5, Math.round(6 * scale))
    const fullHeight = Math.max(peekHeight, Math.round(36 * scale))
    let tabHeight = peekHeight
    const body = Revealer({
        revealChild: false,
        transitionType: Gtk.RevealerTransitionType.SLIDE_UP,
    })
    const face = DrawingArea({
        widthRequest: Math.round(164 * scale),
        heightRequest: peekHeight,
    })
    face.connect("draw", (_w, ctx) => {
        const w = face.get_allocated_width(), visibleHeight = face.get_allocated_height()
        const h = fullHeight
        ctx.save()
        ctx.translate(0, visibleHeight - h)
        const cut = Math.min(14 * scale, h / 2)
        const path = () => {
            ctx.moveTo(0, 0.5); ctx.lineTo(w - cut, 0.5)
            ctx.lineTo(w - 0.5, cut); ctx.lineTo(w - 0.5, h)
            ctx.lineTo(0, h); ctx.closePath()
        }
        path()
        ctx.setSourceRGBA(...NEON.modalbg.map(v => v / 255), 0.98); ctx.fill()
        path()
        ctx.setSourceRGBA(...NEON.dock.map(v => v / 255), 0.95)
        ctx.setLineWidth(Math.max(1, scale)); ctx.stroke()
        ctx.selectFontFace(TITLE, 0, 1)
        ctx.setFontSize(Math.max(9, 12 * scale))
        ctx.moveTo(12 * scale, h / 2 + 4 * scale)
        ctx.showText(`${expanded ? "−" : "+"} CONTROLS`)
        ctx.restore()
        if (visibleHeight < fullHeight) {
            ctx.moveTo(0, 0.5); ctx.lineTo(w - 0.5, 0.5)
            ctx.setSourceRGBA(...NEON.dock.map(v => v / 255), 0.95)
            ctx.stroke()
        }
        return false
    })
    const updateTab = (animate = true) => {
        if (tabTimer) { tabTimer.cancel(); tabTimer = null }
        const target = hovered || expanded ? fullHeight : peekHeight
        const step = () => {
            tabTimer = null
            tabHeight = animate && animOn("animModal") ? tabHeight + (target - tabHeight) * 0.3 : target
            if (Math.abs(target - tabHeight) < 0.5) tabHeight = target
            face.set_size_request(Math.round(164 * scale), Math.round(tabHeight))
            face.queue_draw()
            if (tabHeight !== target) tabTimer = timeout(16, step)
        }
        step()
    }
    const tab = Button({
        className: "controls-tray-tab",
        halign: Gtk.Align.START,
        child: face,
        onClicked: () => toggle(),
    })
    tab.get_accessible()?.set_name("Controls tray")
    const panel = Box({ vertical: true, children: [body, tab] })
    const root = EventBox({ className: "controls-tray", child: panel })
    const cancelLeave = () => {
        if (leaveTimer) { leaveTimer.cancel(); leaveTimer = null }
    }
    const setExpanded = (open: boolean) => {
        cancelLeave()
        if (expanded === open) return expanded
        expanded = open
        if (open && !content) {
            content = Box({
                vertical: true,
                children: [Toggles(mon, false), HorizDock(mon)],
            })
            body.add(content)
            content.show_all()
            content.no_show_all = true
        }
        if (open) content.visible = true
        body.reveal_child = open
        // With animations disabled, GTK can complete before the notify handler.
        if (!open && !body.child_revealed && content) content.visible = false
        updateTab()
        return expanded
    }
    const toggle = () => setExpanded(!expanded)
    body.connect("notify::child-revealed", () => {
        if (!expanded && !body.child_revealed && content) content.visible = false
    })
    root.add_events(Gdk.EventMask.ENTER_NOTIFY_MASK | Gdk.EventMask.LEAVE_NOTIFY_MASK)
    root.connect("enter-notify-event", (_w, event) => {
        if (event.detail !== Gdk.NotifyType.INFERIOR) {
            cancelLeave(); hovered = true; updateTab()
        }
        return false
    })
    root.connect("leave-notify-event", (_w, event) => {
        // Moving between the tab and its controls is still inside the tray.
        if (event.detail !== Gdk.NotifyType.INFERIOR) {
            cancelLeave()
            leaveTimer = timeout(160, () => { leaveTimer = null; hovered = false; updateTab() })
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
        cancelLeave()
        if (tabTimer) { tabTimer.cancel(); tabTimer = null }
        unsubscribe()
        offConfig()
        if (trays.get(mon) === controller) trays.delete(mon)
    })
    return root
}
