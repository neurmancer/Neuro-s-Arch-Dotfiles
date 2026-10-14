import { Window, DrawingArea, activeMonitor } from "./widget.ts"
import { Anchor, Layer, Exclusivity } from "./widget.ts"
import { interval, timeout, execAsync } from "astal"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { CYBER_DIR, USER_DIR, SCALE, winScale } from "../../env.ts"
import { TITLE, MONO } from "./fonts.ts"
import { passthrough } from "./anim.ts"
import { NEON, onColorChange, isOvr } from "./colors.ts"
import { animOn, onConfigChange } from "./config.ts"
import { readUserLua, readThemeActions, resolveCombo } from "./userbinds.ts"

const CARD_W = 396, CARD_H = 146, INSET = 8
let area: any = null, win: any = null
let tick = 0, opacity = 0
let phase = "hidden", mode = "update"
let dismissed = false, count = 0, lastList: string[] = []
let tVer = "", tLocal = "", tBody: string[] = [], tDismissed = false, aurPending = false
let installedTitle = "", installedInfo = ""
let autoT: any = null, nextT: any = null
let reviewKey = "", dismissKey = ""

export const getAurUpdates = () =>
    execAsync(["sh", "-c", `'${CYBER_DIR}/scripts/aur' check`]).then((out: string) => {
        const lines = out.split("\n")
        count = parseInt((lines[0] || "0").trim()) || 0
        lastList = lines.slice(1).map((s) => s.trim()).filter(Boolean)
        if (mode === "update") area?.queue_draw()
        return { count, list: lastList }
    }).catch(() => ({ count: 0, list: [] as string[] }))

export const cachedAurUpdates = () => ({ count, list: lastList })

export const startUpgrade = () => execAsync(["sh", "-c", `'${CYBER_DIR}/scripts/aur' upgrade`]).catch(() => { })


const UPDATER = `${CYBER_DIR}/updater.sh`

export const getThemeUpdate = () =>
    execAsync(["sh", "-c", `'${UPDATER}' check`]).then((out: string) => {
        const lines = out.split("\n")
        const avail = (lines[0] || "").trim() === "1"
        tLocal = (lines[1] || "").trim()
        tVer = avail ? (lines[2] || "").trim() : ""
        tBody = avail ? lines.slice(3).map((s) => s.replace(/\s+$/, "")) : []
        while (tBody.length && !tBody[tBody.length - 1]) tBody.pop()
        return { avail: avail && !!tVer, local: tLocal, remote: tVer, body: tBody }
    }).catch(() => ({ avail: false, local: tLocal, remote: "", body: [] as string[] }))

export const cachedThemeUpdate = () => ({ avail: !!tVer, local: tLocal, remote: tVer, body: tBody })

export const startThemeUpdate = () => execAsync(["sh", "-c", `'${UPDATER}' --spawn`]).catch(() => { })


// The card uses fixed geometry, with one short frame-clock transition and no
// animation work once shown. It remains click-through like the other notices.
const queueNext = (delay: number, show: () => void) => {
    if (nextT) nextT.cancel()
    nextT = timeout(delay, () => { nextT = null; show() })
}
const finishHidden = () => {
    phase = "hidden"
    if (win) win.visible = false
    if (mode === "theme" && aurPending) { aurPending = false; queueNext(2000, showAurBar) }
    else if (mode === "installed" && !tDismissed && tVer) {
        aurPending = !dismissed && count > 0; queueNext(500, showThemeBar)
    } else if (mode === "installed" && !dismissed && count > 0) queueNext(500, showAurBar)
}
const stopTick = () => {
    if (tick) { area?.remove_tick_callback(tick); tick = 0 }
}
const transition = (show: boolean) => {
    stopTick()
    const target = show ? 1 : 0, from = opacity
    phase = show ? "entering" : "exiting"
    const finish = () => {
        opacity = target
        if (show) phase = "shown"
        else finishHidden()
        area?.queue_draw()
    }
    if (!area || !animOn("animNotif") || from === target) { finish(); return }
    const start = GLib.get_monotonic_time()
    const duration = (show ? 180_000 : 140_000) * Math.abs(target - from)
    tick = area.add_tick_callback((_widget, clock) => {
        const progress = animOn("animNotif") ? Math.min(1, Math.max(0, (clock.get_frame_time() - start) / duration)) : 1
        opacity = from + (target - from) * (1 - (1 - progress) ** 3)
        area.queue_draw()
        if (progress < 1) return true
        tick = 0; finish(); return false
    })
    area.queue_draw()
}
const startOut = () => { if (phase !== "hidden") transition(false) }
const shortcut = (id: string, fallback: string, user: ReturnType<typeof readUserLua>) => {
    const action = readThemeActions().find(action => action.id === id)
    return action ? resolveCombo(action, user.rebinds, user.themeMod || "SUPER + SHIFT").toUpperCase() : fallback
}
const showCard = () => {
    if (nextT) { nextT.cancel(); nextT = null }
    try {
        win.gdkmonitor = activeMonitor()
        const scale = winScale(win)
        area.set_size_request(Math.round((CARD_W + INSET * 2) * scale), Math.round((CARD_H + INSET * 2) * scale))
        win.set_margin_left?.(Math.round(14 * scale))
    } catch {}
    const user = readUserLua()
    reviewKey = shortcut(mode === "theme" ? "hud.update" : "hud.aur", mode === "theme" ? "SUPER + SHIFT + Q" : "SUPER + SHIFT + U", user)
    dismissKey = shortcut("hud.aurdis", "SUPER + SHIFT + J", user)
    win.visible = true
    transition(true)
}
export const showAurBar = () => {
    if (!win || dismissed || count <= 0 || phase !== "hidden") return
    mode = "update"; showCard()
}
export const showThemeBar = () => {
    if (!win || tDismissed || !tVer || phase !== "hidden") return
    mode = "theme"; showCard()
}
export const showInstalled = (title: string, info: string) => {
    if (!win) return
    mode = "installed"; installedTitle = title; installedInfo = info
    if (autoT) autoT.cancel()
    showCard()
    autoT = timeout(120000, () => { autoT = null; startOut() })
}
export const dismissAurBar = () => {
    if (phase === "hidden") return
    if (autoT) { autoT.cancel(); autoT = null }
    if (mode === "update") dismissed = true
    if (mode === "theme") tDismissed = true
    startOut()
}
export const dismissThemeBar = () => {
    if (mode === "theme" && phase !== "hidden") dismissAurBar()
}

const draw = (ctx: any) => {
    ctx.setOperator(0); ctx.paint(); ctx.setOperator(2)
    if (phase === "hidden" || opacity <= 0) return
    ctx.save(); ctx.translate(INSET - (1 - opacity) * 6, INSET)
    const ink = (color: number[], alpha = 1) => ctx.setSourceRGBA(...color.map(v => v / 255), alpha * opacity)
    const path = () => {
        ctx.moveTo(0.5, 0.5); ctx.lineTo(CARD_W - 12, 0.5); ctx.lineTo(CARD_W - 0.5, 12)
        ctx.lineTo(CARD_W - 0.5, CARD_H - 12); ctx.lineTo(CARD_W - 12, CARD_H - 0.5)
        ctx.lineTo(0.5, CARD_H - 0.5); ctx.closePath()
    }
    path(); ink(NEON.aurbg, 0.97); ctx.fill()
    path(); ink(NEON.aurline, 0.6); ctx.setLineWidth(1); ctx.stroke()
    ink(NEON.aurline, 0.95); ctx.rectangle(0, 0, 56, 3); ctx.fill()
    ink(NEON.aurline, 0.45); ctx.rectangle(0, 17, 3, 57); ctx.fill()
    const text = (label: string, x: number, y: number, size: number, color: number[], alpha = 1, maxWidth = CARD_W - 36) => {
        ctx.selectFontFace(size >= 14 ? TITLE : MONO, 0, size >= 14 ? 1 : 0)
        ctx.setFontSize(size)
        let shown = label.replace(/\s+/g, " ").trim()
        if (ctx.textExtents(shown).width > maxWidth) {
            while (shown && ctx.textExtents(shown + "…").width > maxWidth) shown = shown.slice(0, -1)
            shown += "…"
        }
        ink(color, alpha); ctx.moveTo(x, y); ctx.showText(shown)
    }
    const tag = mode === "update" ? "PACKAGES" : mode === "theme" ? "ENVIRONMENT" : "COMPLETE"
    text("SYSTEM / MAINTENANCE", 18, 22, 8, NEON.aurlbl, 0.7, 230)
    text(tag, CARD_W - 101, 22, 8, NEON.aurlbl, 0.65, 83)
    const title = mode === "update" ? `${count} PACKAGE${count === 1 ? "" : "S"} READY`
        : mode === "theme" ? "ENVIRONMENT UPDATE" : installedTitle
    const detail = mode === "update" ? "Repository + AUR updates available"
        : mode === "theme" ? `${tLocal || "Installed version"} → ${tVer}` : installedInfo
    // Legacy title defaults were dark text on a neon banner. Use readable
    // foreground on this dark card while respecting explicit title overrides.
    text(title, 18, 52, 19, isOvr("aurtitle") ? NEON.aurtitle : NEON.aurfg)
    text(detail, 18, 74, 10, NEON.aurfg, 0.7)
    ink(NEON.aurline, 0.25); ctx.moveTo(18, 90.5); ctx.lineTo(CARD_W - 18, 90.5); ctx.stroke()
    const action = (x: number, label: string, combo: string) => {
        text(label, x, 111, 9, NEON.aurlbl, 0.95, 168)
        text(combo, x, 130, 8, NEON.aurfg, 0.6, 168)
    }
    if (mode !== "installed") action(18, mode === "theme" ? "REVIEW RELEASE" : "REVIEW UPDATES", reviewKey)
    action(mode === "installed" ? 18 : 216, "DISMISS", dismissKey)
    ctx.restore()
}

const STAMP = `${USER_DIR}/update-done`

const takeStamp = () => {
    try {
        if (!GLib.file_test(STAMP, GLib.FileTest.EXISTS)) return ""
        const [ok, bytes] = GLib.file_get_contents(STAMP)
        try { Gio.File.new_for_path(STAMP).delete(null) } catch { }
        return ok ? new TextDecoder().decode(bytes).trim() : ""
    } catch { return "" }
}

const bootCheck = () => {
    const applied = takeStamp()
    if (applied) {
        getAurUpdates()
        timeout(2500, () => showInstalled("CYBERARCH UPDATED!", `NOW ON V${applied}`))
        return
    }
    Promise.all([getThemeUpdate(), getAurUpdates()]).then(([t, r]) => {
        if (t.avail) { aurPending = r.count > 0; showThemeBar() }
        else if (r.count > 0) showAurBar()
    })
}

export const AurBarWindow = () => {
    area = DrawingArea({})
    area.set_size_request(Math.round((CARD_W + INSET * 2) * SCALE), Math.round((CARD_H + INSET * 2) * SCALE))
    const offColor = onColorChange(() => area?.queue_draw())
    const offConfig = onConfigChange(() => {
        if (!animOn("animNotif") && (phase === "entering" || phase === "exiting")) transition(phase === "entering")
    })
    area.connect("draw", (_w: any, ctx: any) => { ctx.scale(winScale(win), winScale(win)); draw(ctx); return false })
    win = Window({
        name: "aurbar", className: "aug aurbar",
        anchor: Anchor.LEFT, layer: Layer.OVERLAY, exclusivity: Exclusivity.IGNORE,
        margin_left: Math.round(14 * SCALE), visible: false, child: area,
    })
    passthrough(win)
    const bootT = timeout(3500, bootCheck)
    const recheck = interval(1800000, () => { if (!dismissed) getAurUpdates().then(r => { if (r.count > 0) showAurBar() }) })
    const tRecheck = interval(21600000, () => { if (!tDismissed) getThemeUpdate().then(t => { if (t.avail) showThemeBar() }) })
    win.connect("destroy", () => {
        stopTick(); bootT.cancel(); recheck.cancel(); tRecheck.cancel()
        autoT?.cancel(); nextT?.cancel(); autoT = null; nextT = null
        offColor(); offConfig(); area = null; win = null; phase = "hidden"; opacity = 0
    })
    return win
}
