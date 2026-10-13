import { latestTask } from "./latest-task.ts"
import GLib from "gi://GLib"
import GdkPixbufLib from "gi://Gdk?version=3.0"
import { execAsync } from "astal"
import { applyWmFromTheme } from "./wmconfig.ts"
import { CYBER_DIR, USER_DIR } from "../../env.ts"

export type RGB = [number, number, number]

export const f = (c: RGB): [number, number, number] =>
    [c[0] / 255, c[1] / 255, c[2] / 255]

export const NEON: Record<string, RGB> = {
    red: [255, 42, 58],
    cyan: [94, 244, 248],
    magenta: [228, 50, 200],
    green: [80, 240, 150],
    amber: [255, 178, 36],
    blue: [60, 120, 255],
    white: [225, 232, 242],
    dim: [80, 80, 100],
    grid: [40, 50, 70],
    dock: [94, 244, 248],
    press: [255, 42, 58],
    netinfo: [255, 222, 105],
    notifred: [255, 74, 68],
    notifyel: [255, 214, 46],
    notifcyn: [108, 230, 246],
    goldf: [112, 94, 26],
    goldd: [74, 61, 15],
    notifgrey: [178, 184, 192],
    glyphcol: [175, 48, 42],
    msggrey: [120, 130, 140],
    dimred: [80, 15, 15],
    appsred: [251, 109, 97],
    hudcyan: [85, 222, 255],
    darkred: [120, 36, 40],
    notifbadge: [240, 24, 20],
    aurgreen: [43, 225, 133],
    aurbrt: [150, 255, 200],
    aurblack: [6, 14, 9],
    aurwht: [232, 255, 240],
    f25: [242, 91, 86],
    overlay: [255, 42, 58],
    sysveil: [255, 42, 58],
    pure: [255, 255, 255],
    glassacc: [196, 248, 255],
    modalbg: [0, 0, 0],
    modalhov: [85, 222, 255],
    wheelbg: [15, 39, 40],
    wheelfg: [94, 244, 248],
    dockv: [94, 244, 248],
    dockh: [94, 244, 248],
    dockvh: [255, 42, 58],
    dockhh: [255, 42, 58],
    launchico: [255, 255, 255],
    launchlbl: [255, 42, 58],
    mapclock: [130, 231, 215],
    mapcity: [176, 255, 157],
    mapwx: [255, 222, 105],
    mapaccent: [94, 244, 248],
    maptile: [255, 255, 255],
    netchip: [255, 222, 105],
    netdown: [255, 42, 58],
    netup: [94, 244, 248],
    mktacc: [255, 222, 105],
    mkthov: [255, 178, 36],
    aurbg: [6, 14, 9],
    aurfg: [232, 255, 240],
    auricon: [255, 20, 45],
    aurlbl: [43, 225, 133],
    aurtitle: [232, 255, 240],
    aurline: [43, 225, 133],
    notifphone: [94, 244, 248],
    notifmail: [108, 230, 246],
    notifheads: [255, 214, 46],
    notiftitle: [255, 74, 68],
    notiffg: [178, 184, 192],
    notifbg: [0, 0, 0],
    notiflbl: [108, 230, 246],
    radiotitle: [94, 244, 248],
    radiohdrbg: [0, 0, 0],
    radioacc: [255, 42, 58],
    radiovol: [94, 244, 248],
    radiotrkfg: [94, 244, 248],
    radiotrkbg: [0, 0, 0],
    radioctl: [94, 244, 248],
}

export type PaletteName = "NETWATCH" | "BLADE" | "SYNTHWAVE" | "JOHNNY" | "GHOST" | "NSD"

export const PALETTES: Record<string, Partial<Record<string, RGB>>> = {
    NETWATCH: {
        red: [255, 42, 58], cyan: [94, 244, 248], magenta: [228, 50, 200],
        green: [80, 240, 150], amber: [255, 178, 36], blue: [60, 120, 255],
        white: [225, 232, 242], dim: [80, 80, 100], grid: [40, 50, 70],
        dock: [94, 244, 248], press: [255, 42, 58],
        netinfo: [255, 222, 105],
        notifred: [255, 74, 68],
        notifyel: [255, 214, 46],
        notifcyn: [108, 230, 246],
        goldf: [112, 94, 26],
        goldd: [74, 61, 15],
        notifgrey: [178, 184, 192],
        glyphcol: [175, 48, 42],
        msggrey: [120, 130, 140],
        dimred: [80, 15, 15],
        appsred: [251, 109, 97],
        hudcyan: [85, 222, 255],
        darkred: [120, 36, 40],
        notifbadge: [240, 24, 20],
        aurgreen: [43, 225, 133],
        aurbrt: [150, 255, 200],
        aurblack: [6, 14, 9],
        aurwht: [232, 255, 240],
        f25: [242, 91, 86],
        pure: [255, 255, 255],
        glassacc: [196, 248, 255],
        overlay: [255, 42, 58],
        sysveil: [255, 42, 58],
    },
    // replaced the old dark theme. dusk amber/rust base, pink/purple only on
    // notifications and toasts, terminal interfaces in cyan/teal
    BLADE: {
        red: [183, 81, 7], cyan: [1, 180, 178], magenta: [202, 83, 170],
        green: [146, 99, 43], amber: [195, 120, 18], blue: [86, 155, 178],
        white: [224, 214, 200], dim: [127, 123, 157], grid: [26, 18, 14],
        dock: [183, 81, 7], press: [187, 56, 160],
        netinfo: [189, 128, 59],
        notifred: [202, 83, 170],
        notifyel: [195, 120, 18],
        notifcyn: [1, 180, 178],
        goldf: [58, 28, 122],
        goldd: [34, 16, 70],
        notifgrey: [127, 123, 157],
        glyphcol: [187, 56, 160],
        msggrey: [127, 123, 157],
        dimred: [116, 50, 8],
        appsred: [195, 120, 18],
        hudcyan: [2, 155, 156],
        darkred: [80, 41, 11],
        notifbadge: [187, 56, 160],
        aurgreen: [187, 56, 160],
        aurbrt: [217, 119, 191],
        aurblack: [42, 8, 36],
        aurwht: [224, 214, 200],
        f25: [187, 56, 160],
        pure: [232, 226, 216],
        glassacc: [1, 180, 178],
        overlay: [1, 180, 178],
        dockvh: [255, 230, 126],
        dockhh: [255, 230, 126],
        wheelfg: [1, 180, 178],
        modalhov: [1, 180, 178],
        notiffg: [1, 180, 178],
        notiflbl: [1, 180, 178],
        notifheads: [217, 119, 191],
        notiftitle: [2, 155, 156],
        notifphone: [187, 56, 160],
        notifmail: [187, 56, 160],
        notifbg: [13, 66, 72],
        sysveil: [187, 56, 160],
    },
    SYNTHWAVE: {
        red: [255, 45, 150], cyan: [45, 220, 210], magenta: [230, 60, 220],
        green: [170, 90, 255], amber: [255, 165, 60], blue: [90, 70, 230],
        white: [250, 232, 250], dim: [120, 85, 150], grid: [45, 20, 70],
        dock: [255, 45, 190], press: [255, 55, 170],
        netinfo: [70, 230, 110],
        notifred: [255, 50, 160],
        notifyel: [255, 165, 60],
        notifcyn: [45, 220, 210],
        goldf: [70, 30, 80],
        goldd: [40, 16, 48],
        notifgrey: [225, 195, 225],
        glyphcol: [45, 220, 210],
        msggrey: [130, 90, 150],
        dimred: [255, 50, 160],
        appsred: [255, 50, 160],
        hudcyan: [55, 210, 205],
        darkred: [150, 110, 170],
        notifbadge: [255, 55, 190],
        aurgreen: [45, 220, 210],
        aurbrt: [250, 232, 250],
        aurblack: [35, 15, 55],
        aurwht: [250, 232, 250],
        f25: [255, 50, 160],
        pure: [250, 232, 250],
        glassacc: [80, 255, 140],
        overlay: [255, 60, 190],
        sysveil: [255, 60, 190],
    },
    JOHNNY: {
        red: [255, 208, 60], cyan: [94, 244, 248], magenta: [110, 90, 220],
        green: [255, 214, 90], amber: [255, 232, 130], blue: [70, 110, 190],
        white: [250, 246, 228], dim: [130, 116, 70], grid: [40, 50, 84],
        dock: [70, 110, 190], press: [255, 208, 60],
        netinfo: [70, 110, 190],
        notifred: [255, 208, 60],
        notifyel: [255, 232, 130],
        notifcyn: [70, 110, 190],
        goldf: [76, 69, 39],
        goldd: [45, 41, 23],
        notifgrey: [250, 246, 228],
        glyphcol: [255, 208, 60],
        msggrey: [130, 116, 70],
        dimred: [255, 208, 60],
        appsred: [255, 208, 60],
        hudcyan: [94, 244, 248],
        darkred: [255, 208, 60],
        notifbadge: [94, 244, 248],
        aurgreen: [255, 214, 90],
        aurbrt: [250, 246, 228],
        aurblack: [40, 50, 84],
        aurwht: [250, 246, 228],
        f25: [255, 208, 60],
        pure: [250, 246, 228],
        glassacc: [250, 246, 228],
        overlay: [255, 208, 60],
        sysveil: [255, 208, 60],
    },
    GHOST: {
        red: [0, 255, 120], cyan: [40, 255, 140], magenta: [40, 200, 120],
        green: [60, 255, 120], amber: [120, 255, 90], blue: [30, 160, 90],
        white: [200, 255, 220], dim: [40, 90, 60], grid: [10, 22, 16],
        dock: [40, 255, 140], press: [80, 255, 140],
        netinfo: [40, 255, 140],
        notifred: [0, 255, 120],
        notifyel: [120, 255, 90],
        notifcyn: [40, 255, 140],
        goldf: [36, 76, 27],
        goldd: [21, 45, 16],
        notifgrey: [200, 255, 220],
        glyphcol: [0, 255, 120],
        msggrey: [40, 90, 60],
        dimred: [0, 255, 120],
        appsred: [0, 255, 120],
        hudcyan: [255, 60, 40],
        darkred: [0, 255, 120],
        notifbadge: [255, 60, 40],
        aurgreen: [60, 255, 120],
        aurbrt: [200, 255, 220],
        aurblack: [10, 22, 16],
        aurwht: [200, 255, 220],
        f25: [0, 255, 120],
        pure: [200, 255, 220],
        glassacc: [200, 255, 220],
        overlay: [0, 255, 120],
        sysveil: [0, 255, 120],
    },
}

// NSD: primary purple #C170FF, accent green #00EB74, supporting blue #5A96FF.
PALETTES.NSD = {
    red: [193, 112, 255],
    cyan: [0, 235, 116],
    magenta: [193, 112, 255],
    green: [0, 235, 116],
    amber: [0, 235, 116],
    blue: [90, 150, 255],
    white: [225, 232, 250],
    dim: [145, 153, 180],
    grid: [30, 38, 64],
    dock: [193, 112, 255],
    press: [0, 235, 116],
    netinfo: [0, 235, 116],
    notifred: [193, 112, 255],
    notifyel: [0, 235, 116],
    notifcyn: [193, 112, 255],
    goldf: [36, 25, 55],
    goldd: [36, 25, 55],
    notifgrey: [225, 232, 250],
    glyphcol: [193, 112, 255],
    msggrey: [145, 153, 180],
    dimred: [36, 25, 55],
    appsred: [193, 112, 255],
    hudcyan: [193, 112, 255],
    darkred: [36, 25, 55],
    notifbadge: [0, 235, 116],
    aurgreen: [0, 235, 116],
    aurbrt: [166, 255, 207],
    aurblack: [12, 16, 28],
    aurwht: [225, 232, 250],
    f25: [193, 112, 255],
    overlay: [193, 112, 255],
    sysveil: [193, 112, 255],
    pure: [225, 232, 250],
    glassacc: [193, 112, 255],
    modalbg: [12, 16, 28],
    modalhov: [0, 235, 116],
    wheelbg: [12, 16, 28],
    wheelfg: [193, 112, 255],
    dockv: [193, 112, 255],
    dockh: [193, 112, 255],
    dockvh: [0, 235, 116],
    dockhh: [0, 235, 116],
    launchico: [193, 112, 255],
    launchlbl: [0, 235, 116],
    mapclock: [193, 112, 255],
    mapcity: [0, 235, 116],
    mapwx: [0, 235, 116],
    mapaccent: [193, 112, 255],
    maptile: [193, 112, 255],
    netchip: [0, 235, 116],
    netdown: [193, 112, 255],
    netup: [0, 235, 116],
    mktacc: [193, 112, 255],
    mkthov: [0, 235, 116],
    aurbg: [12, 16, 28],
    aurfg: [225, 232, 250],
    auricon: [193, 112, 255],
    aurlbl: [0, 235, 116],
    aurtitle: [225, 232, 250],
    aurline: [0, 235, 116],
    notifphone: [193, 112, 255],
    notifmail: [193, 112, 255],
    notifheads: [0, 235, 116],
    notiftitle: [225, 232, 250],
    notiffg: [225, 232, 250],
    notifbg: [12, 16, 28],
    notiflbl: [0, 235, 116],
    radiotitle: [193, 112, 255],
    radiohdrbg: [12, 16, 28],
    radioacc: [0, 235, 116],
    radiovol: [0, 235, 116],
    radiotrkfg: [193, 112, 255],
    radiotrkbg: [12, 16, 28],
    radioctl: [0, 235, 116],
}

export const USER: Record<string, [number, number, number]> = {}
for (const k of Object.keys(NEON)) USER[k] = f(NEON[k])

export const USER_A: Record<string, number> = {
    modalbg: 1, wheelbg: 1, maptile: 1, aurbg: 1, notifbg: 1, radiohdrbg: 1, radiotrkbg: 1,
}

const OVR: Record<string, boolean> = {}
export const isOvr = (key: string) => OVR[key] === true

type Mul = number | [number, number, number]

const DERIVE: Record<string, [string, Mul]> = {
    modalbg: ["dock", 0.12],
    modalhov: ["hudcyan", 1],
    wheelbg: ["dock", [0.16, 0.16, 0.2]],
    wheelfg: ["dock", 1],
    dockv: ["dock", 1],
    dockh: ["dock", 1],
    dockvh: ["press", 1],
    dockhh: ["press", 1],
    launchico: ["maptile", 1],
    launchlbl: ["dock", 1],
    auricon: ["red", 1],
    notifphone: ["press", 1],
    mapaccent: ["cyan", 1],
    netchip: ["netinfo", 1],
    netdown: ["red", 1],
    netup: ["cyan", 1],
    mktacc: ["netinfo", 1],
    mkthov: ["amber", 1],
    aurbg: ["aurblack", 1],
    aurfg: ["aurwht", 1],
    aurlbl: ["aurgreen", 1],
    aurline: ["aurgreen", 1],
    notifmail: ["notifcyn", 1],
    notifheads: ["notifyel", 1],
    notiftitle: ["notifcyn", 1],
    notiffg: ["notifyel", 1],
    notiflbl: ["notifcyn", 1],
    notifbg: ["goldf", 1],
    radiotitle: ["dock", 1],
    radiohdrbg: ["red", 0.22],
    radioacc: ["red", 1],
    radiovol: ["dock", 1],
    radiotrkfg: ["dock", 1],
    radiotrkbg: ["dock", 1],
    radioctl: ["dock", 1],
}

const resetAlpha = () => { for (const k of Object.keys(USER_A)) if (!OVR[k]) USER_A[k] = 1 }
const applyDeriveTable = (pinned: Record<string, Partial<Record<string, RGB>>> = PALETTES, name = curPalette) => {
    const pin = pinned[name] || {}
    for (const k of Object.keys(DERIVE)) {
        if (OVR[k] || pin[k]) continue
        const [src, mul] = DERIVE[k]
        const s = NEON[src]
        if (!s) continue
        const m: [number, number, number] = typeof mul === "number" ? [mul, mul, mul] : mul
        setColor(k, [s[0] * m[0], s[1] * m[1], s[2] * m[2]] as RGB, false)
    }
}

export const imgTint = { value: null as RGB | null, strength: 0 }
const IMG_TINT: Record<string, [RGB, number]> = {
    NSD: [[193, 112, 255], 0.65],
    BLADE: [[81, 37, 11], 0.62],
    JOHNNY: [[255, 208, 60], 0.85],
    GHOST: [[0, 255, 120], 0.88],
    SYNTHWAVE: [[255, 60, 220], 0.85],
}
const updateImgTint = (name: string) => {
    const e = IMG_TINT[name]
    if (!OVR.maptile) setColor("maptile", e ? e[0] : [255, 255, 255], false)
    const base = e ? e[1] : (OVR.maptile ? 1 : 0)
    imgTint.value = (e || OVR.maptile) ? NEON.maptile : null
    imgTint.strength = base * USER_A.maptile
}

export const tintSurface = (ctx: any, surf: any, w: number, h: number, a = 1, colorOverride: RGB | null = null, strength = -1) => {
    const tc = colorOverride || imgTint.value
    if (!tc || !surf) return
    const st = strength >= 0 ? strength : (colorOverride ? 1 : imgTint.strength)
    try {
        ctx.setSourceSurface(surf, 0, 0); ctx.paintWithAlpha(a)
        ctx.setOperator(27)
        ctx.setSourceRGBA(tc[0] / 255, tc[1] / 255, tc[2] / 255, st * a)
        ctx.maskSurface(surf, 0, 0)
        ctx.setOperator(2)
    } catch {}
}

export const tintSurfaceFlat = (ctx: any, surf: any, w: number, h: number, a = 1, colorOverride: RGB | null = null) => {
    const tc = colorOverride || imgTint.value
    if (!tc || !surf) return
    try {
        ctx.setSourceSurface(surf, 0, 0)
        const pat = ctx.getSource()
        ctx.setSourceRGBA(tc[0] / 255, tc[1] / 255, tc[2] / 255, (colorOverride ? 1 : imgTint.strength) * a)
        ctx.mask(pat)
    } catch {}
}

export const tintOpaque = (ctx: any, w: number, h: number, a = 1) => {
    const tc = imgTint.value
    if (!tc) return
    ctx.save()
    ctx.rectangle(0, 0, w, h); ctx.clip()
    ctx.setOperator(27); ctx.setSourceRGBA(tc[0] / 255, tc[1] / 255, tc[2] / 255, imgTint.strength * a); ctx.paint()
    ctx.setOperator(2)
    ctx.restore()
}

export const tintPixbuf = (ctx: any, pb: any, x: number, y: number, a = 1, colorOverride: RGB | null = null, strength = -1) => {
    const tc = colorOverride || imgTint.value
    if (!tc || !pb) return
    const st = strength >= 0 ? strength : (colorOverride ? 1 : imgTint.strength)
    try {
        GdkPixbufLib.cairo_set_source_pixbuf(ctx, pb, x, y)
        const pat = ctx.getSource()
        ctx.paintWithAlpha(a)
        ctx.setOperator(27)
        ctx.setSourceRGBA(tc[0] / 255, tc[1] / 255, tc[2] / 255, st * a)
        ctx.mask(pat)
        ctx.setOperator(2)
    } catch {}
}

const GLASS_ALPHA: Record<string, number> = { GHOST: 0.14, BLADE: 0.85 }
export const glassAlpha = { value: 1 }
const updateGlassAlpha = (name: string) => { glassAlpha.value = GLASS_ALPHA[name] ?? 1 }

const GLASS_MODE: Record<string, boolean> = { BLADE: true }
export const glassMode = { value: false }
const updateGlassMode = (name: string) => { glassMode.value = GLASS_MODE[name] ?? false }

type MenuBg = { bg: RGB; bgA: number; fog: RGB | null; fogA: number }
const MENU_BG_DEF: MenuBg = { bg: [2, 1, 4], bgA: 0.5, fog: [255, 42, 58], fogA: 0.18 }
const MENU_BG: Record<string, MenuBg> = {
    NSD: { bg: [7, 9, 18], bgA: 0.55, fog: [193, 112, 255], fogA: 0.18 },
    NETWATCH: { bg: [2, 1, 4], bgA: 0.5, fog: [255, 42, 58], fogA: 0.18 },
    JOHNNY: { bg: [2, 4, 10], bgA: 0.5, fog: [255, 208, 60], fogA: 0.18 },
    BLADE: { bg: [3, 2, 2], bgA: 0.55, fog: [128, 33, 122], fogA: 0.26 },
    GHOST: { bg: [0, 6, 3], bgA: 0.45, fog: [0, 255, 120], fogA: 0.18 },
    SYNTHWAVE: { bg: [6, 0, 10], bgA: 0.5, fog: [255, 60, 220], fogA: 0.2 },
}
export const menuBg = { ...MENU_BG_DEF }
const updateMenuBg = (name: string) => {
    const e = MENU_BG[name] ?? MENU_BG_DEF
    menuBg.bg = e.bg; menuBg.bgA = e.bgA; menuBg.fog = e.fog; menuBg.fogA = e.fogA
}

type MapAccent = { clock: RGB; city: RGB; forecast: RGB | null }
const MAP_ACCENT_DEF: MapAccent = { clock: [130, 231, 215], city: [176, 255, 157], forecast: null }
const MAP_ACCENT: Record<string, MapAccent> = {
    NSD: { clock: [193, 112, 255], city: [0, 235, 116], forecast: [0, 235, 116] },
    SYNTHWAVE: { clock: [255, 60, 220], city: [100, 255, 170], forecast: [255, 60, 220] },
    JOHNNY: { clock: [255, 208, 60], city: [176, 255, 157], forecast: null },
    BLADE: { clock: [189, 128, 59], city: [2, 155, 156], forecast: [1, 180, 178] },
}
export const mapAccent = { ...MAP_ACCENT_DEF }
const updateMapAccent = (name: string) => {
    const e = MAP_ACCENT[name] ?? MAP_ACCENT_DEF
    if (!OVR.mapclock) setColor("mapclock", e.clock, false)
    if (!OVR.mapcity) setColor("mapcity", e.city, false)
    if (!OVR.mapwx) setColor("mapwx", e.forecast ?? NEON.netinfo, false)
    mapAccent.clock = NEON.mapclock
    mapAccent.city = NEON.mapcity
    mapAccent.forecast = NEON.mapwx
}

type RGB01 = [number, number, number]
type HudSoft = { acc: RGB01; label: RGB01 }
const HUD_SOFT: Record<string, HudSoft> = {
    BLADE: { acc: [0.004, 0.707, 0.698], label: [0.325, 0.878, 0.871] },
}
export const hudSoft = { acc: [1, 1, 1] as RGB01, label: [1, 1, 1] as RGB01 }
const updateHudSoft = (name: string) => {
    const e = HUD_SOFT[name]
    if (e) { hudSoft.acc = e.acc; hudSoft.label = e.label; return }
    const g = USER.glassacc
    hudSoft.acc = [g[0], g[1], g[2]]
    hudSoft.label = [g[0] * 0.94 + 0.06, g[1] * 0.94 + 0.06, g[2] * 0.94 + 0.06]
}

const NEON_BTN: Record<string, boolean> = { DARK: true }
export const neonBtn = { value: false }
const updateNeonBtn = (name: string) => { neonBtn.value = NEON_BTN[name] ?? false }

const CIRCLE_TINT: Record<string, RGB> = { BLADE: [187, 56, 160] }
export const circleTint = { value: null as RGB | null }
const updateCircleTint = (name: string) => {
    const e = CIRCLE_TINT[name]
    if (!OVR.auricon && e) setColor("auricon", e, false)
    circleTint.value = (e || OVR.auricon) ? NEON.auricon : null
}

const LAUNCHER_TINT: Record<string, RGB> = { NSD: [193, 112, 255], SYNTHWAVE: [45, 220, 210] }
export const launcherTint = { value: null as RGB | null }
const updateLauncherTint = (name: string) => {
    const e = LAUNCHER_TINT[name]
    if (!OVR.launchico && e) setColor("launchico", e, false)
    launcherTint.value = (e || OVR.launchico) ? NEON.launchico : null
}

const LAUNCHER_LABEL_TINT: Record<string, RGB> = { NSD: [0, 235, 116], JOHNNY: [255, 208, 60] }
export const launcherLabelTint = { value: null as RGB | null }
const updateLauncherLabelTint = (name: string) => {
    const e = LAUNCHER_LABEL_TINT[name]
    if (!OVR.launchlbl && e) setColor("launchlbl", e, false)
    launcherLabelTint.value = (e || OVR.launchlbl) ? NEON.launchlbl : null
}

type RadioBg = { color: RGB; alpha: number }
const RADIO_BG: Record<string, RadioBg> = { NSD: { color: [193, 112, 255], alpha: 0.16 }, JOHNNY: { color: [255, 208, 60], alpha: 0.16 } }
export const radioBg = { value: null as RadioBg | null }
const updateRadioBg = (name: string) => {
    const e = RADIO_BG[name]
    if (!OVR.radiohdrbg && e) setColor("radiohdrbg", e.color, false)
    radioBg.value = (e || OVR.radiohdrbg)
        ? { color: NEON.radiohdrbg, alpha: (e ? e.alpha : 0.16) * USER_A.radiohdrbg }
        : null
}

const NOTIF_BUBBLE: Record<string, RGB> = { NSD: [0, 235, 116], NETWATCH: [94, 244, 248] }
export const notifBubble = { value: NOTIF_BUBBLE.NETWATCH as RGB | null }
const updateNotifBubble = (name: string) => {
    const e = NOTIF_BUBBLE[name]
    if (!OVR.notifphone && e) setColor("notifphone", e, false)
    notifBubble.value = (e || OVR.notifphone) ? NEON.notifphone : null
}

export const notifIconTint = { value: null as RGB | null }
const updateNotifIconTint = (name: string) => {
    notifIconTint.value = curPalette === "BLADE" ? NEON.notifphone : null
}

export const aurTitleTint = { value: null as RGB | null }
const updateAurTitleTint = (name: string) => {
    aurTitleTint.value = curPalette === "BLADE" ? NEON.aurbrt : null
    if (!OVR.aurtitle) {
        const d = neonBtn.value ? NEON.press : (aurTitleTint.value || (glassMode.value ? NEON.aurfg : NEON.aurbg))
        setColor("aurtitle", [d[0], d[1], d[2]] as RGB, false)
    }
}

const changeBus: Array<() => void> = []
export const onColorChange = (cb: () => void): (() => void) => { changeBus.push(cb); return () => { const i = changeBus.indexOf(cb); if (i >= 0) changeBus.splice(i, 1) } }
const notifyColorChange = () => { for (const cb of [...changeBus]) { try { cb() } catch (e) { print("[color] notify:", e) } } }

const setColor = (key: string, [r, g, b]: RGB, notify = true) => {
    const ne = NEON[key], us = USER[key]
    if (ne) { ne[0] = r; ne[1] = g; ne[2] = b }
    if (us) { us[0] = r / 255; us[1] = g / 255; us[2] = b / 255 }
    if (key === "glassacc") updateHudSoft(curPalette)
    if (notify) notifyColorChange()
}

export const hexToRgb = (hex: string): RGB | null => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
    if (!m) return null
    const n = parseInt(m[1], 16)
    return [n >> 16 & 255, n >> 8 & 255, n & 255]
}

export const rgbToHex = ([r, g, b]: RGB) =>
    "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")

// each theme has its own Kitty color palette, this maps them
const KITTY_STYLES: Record<string, string> = { NSD: "nsd", GHOST: "ghost", SYNTHWAVE: "synthwave", BLADE: "blade", JOHNNY: "johnny" }

const themeCommand = (script: string, name: string) =>
    execAsync(["env", `CYBER_DIR=${CYBER_DIR}`, `${CYBER_DIR}/scripts/${script}`, name])
        .catch(error => { throw new Error(`${script} (${name}) failed: ${error?.message || String(error) || "no diagnostic output"}`) })

const syncColors = latestTask<string>(async (name, current) => {
    await themeCommand("shell-theme", name)
    if (!current()) return
    await themeCommand("kitty-style", KITTY_STYLES[name] ?? "cybercore")
    if (current()) applyWmFromTheme()
})
const syncWallpaper = latestTask<string | null>(async name => {
    if (name) await themeCommand("theme-wallpaper", name)
})

// The HUD changes synchronously. External color writers remain ordered, while
// wallpaper startup has its own queue and cannot hold up subsequent colors.
export const syncTheme = (name: string, wallpaper = false): Promise<boolean> => {
    const colors = syncColors(name)
    const background = syncWallpaper(wallpaper ? name : null)
    // Color writes can progress while wallpaper starts, but completion means
    // both parts of this selection finished successfully.
    return Promise.all([colors, background]).then(results => results.every(Boolean))
}

let curPalette = "NETWATCH"
// Unlike color matching, this preserves the selected preset after custom edits.
export const getActivePalette = (): string => curPalette

const applyDerived = (name: string) => {
    curPalette = name
    resetAlpha()
    updateImgTint(name)
    applyDeriveTable(PALETTES, name)
    updateGlassAlpha(name)
    updateMenuBg(name)
    updateMapAccent(name)
    updateHudSoft(name)
    updateGlassMode(name)
    updateNeonBtn(name)
    updateCircleTint(name)
    updateLauncherTint(name)
    updateLauncherLabelTint(name)
    updateRadioBg(name)
    updateNotifBubble(name)
    updateNotifIconTint(name)
    updateAurTitleTint(name)
    for (const [key, value] of Object.entries(PALETTES[name] || {}))
        if (!OVR[key]) setColor(key, value as RGB, false)
}

export const applyPalette = (name: string) => {
    const p = PALETTES[name]
    if (!p) return
    for (const k of Object.keys(OVR)) delete OVR[k]
    for (const k of Object.keys(p)) setColor(k, p[k] as RGB, false)
    applyDerived(name)
    notifyColorChange()
}

export const getPaletteName = (): string => {
    for (const name of Object.keys(PALETTES)) {
        const p = PALETTES[name]
        let match = true
        for (const k of Object.keys(p)) {
            const c = NEON[k]
            if (!c || Math.abs(c[0] - (p[k] as RGB)[0]) > 2 || Math.abs(c[1] - (p[k] as RGB)[1]) > 2 || Math.abs(c[2] - (p[k] as RGB)[2]) > 2) { match = false; break }
        }
        if (match) return name
    }
    return "NETWATCH"
}

export const setUserColor = (key: string, rgb: RGB) => {
    OVR[key] = true
    setColor(key, rgb, false)
    applyDerived(curPalette)
    notifyColorChange()
}

export const getUserColor = (key: string): RGB => [NEON[key][0], NEON[key][1], NEON[key][2]] as RGB

export const hasAlpha = (key: string) => USER_A[key] !== undefined

export const getUserAlpha = (key: string): number => USER_A[key] ?? 1

export const setUserAlpha = (key: string, a: number) => {
    if (USER_A[key] === undefined) return
    OVR[key] = true
    USER_A[key] = Math.max(0, Math.min(1, a))
    applyDerived(curPalette)
    notifyColorChange()
}

const COLOR_KEYS = Object.keys(NEON)
const USER_PATH = `${USER_DIR}/user_colors.lua`
const LOGIN_PATH = `${USER_DIR}/login_colors.json`

const writeLoginColors = (): void => {
    try {
        const j = JSON.stringify({
            accent: rgbToHex(NEON.cyan),
            bg: rgbToHex(NEON.modalbg),
            fg: rgbToHex(NEON.glassacc),
            hover: rgbToHex(NEON.modalhov),
        })
        GLib.file_set_contents(LOGIN_PATH, j)
    } catch (e) { print("[color] login:", e) }
}

export const loadUserColors = (): void => {
    try {
        const [ok, bytes] = GLib.file_get_contents(USER_PATH)
        if (!ok) { applyPalette("NETWATCH"); writeLoginColors(); syncTheme("NETWATCH").catch(print); return }
        const src = new TextDecoder().decode(bytes)
        const lines = src.split("\n")
        const declared = /palette\s*=\s*"([A-Z]+)"/.exec(src)?.[1]
        const unavailable = !!declared && !PALETTES[declared]
        // A removed preset falls back to the default; keep explicit user overrides.
        if (unavailable) applyPalette("NETWATCH")
        let saved = ""
        for (const k of Object.keys(OVR)) delete OVR[k]
        for (const line of lines) {
            const o = /over\["(\w+)"\]\s*=\s*true/.exec(line)
            if (o) { OVR[o[1]] = true; continue }
            const p = /palette\s*=\s*"([A-Z]+)"/.exec(line)
            if (p && PALETTES[p[1]]) saved = p[1]
        }
        for (const line of lines) {
            const m = /users\["(\w+)"\]\s*=\s*\{?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?/.exec(line)
            if (!m || !COLOR_KEYS.includes(m[1])) continue
            if (unavailable && !OVR[m[1]]) continue
            setColor(m[1], [parseInt(m[2]), parseInt(m[3]), parseInt(m[4])] as RGB, false)
            if (m[5] !== undefined && USER_A[m[1]] !== undefined) USER_A[m[1]] = Math.max(0, Math.min(1, parseFloat(m[5])))
        }
        const name = unavailable ? "NETWATCH" : saved || getPaletteName()
        applyDerived(name)
        syncTheme(name).catch(print)
        notifyColorChange()
        writeLoginColors()
    } catch (e) { print("[color] load:", e) }
}

export const saveUserColors = (): void => {
    try {
        let out = "local users = {}\nlocal over = {}\n"
        out += `local palette = "${curPalette}"\n`
        for (const k of COLOR_KEYS) {
            const c = NEON[k]
            const a = USER_A[k]
            out += a === undefined
                ? `users["${k}"] = { ${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])} }\n`
                : `users["${k}"] = { ${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a.toFixed(3)} }\n`
        }
        for (const k of Object.keys(OVR)) if (OVR[k]) out += `over["${k}"] = true\n`
        GLib.file_set_contents(USER_PATH, out)
        writeLoginColors()
    } catch (e) { print("[color] save:", e) }
}
