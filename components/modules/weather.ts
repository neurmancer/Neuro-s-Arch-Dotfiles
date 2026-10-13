import { Box, DrawingArea, EventBox, Keymode } from "./widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import { interval, execAsync } from "astal"
import { CYBER_DIR, USER_DIR, scaleOf } from "../../env.ts"
import { makePlane, tiltText, strokePath, fillQuad } from "./proj.ts"
import { NEON, USER, onColorChange, mapAccent } from "./colors.ts"
import { createModal } from "./cmodal.ts"
import { txt as gtxt, pango as gpango, CYAN as GCYAN, ACC as GACC, HEADER as GHEAD, TITLE as GTITLE, MONO as GMONO, pip, projQuad } from "./glass.ts"
import { openTimeModal } from "./timeset.ts"
import { TITLE, MONO, ICONF } from "./fonts.ts"

const W = 320
const plane = makePlane({ w: W, h: 190, yaw: 24, pitch: 3, roll: -1, focal: 1300, dist: 1300, pad: 16 })
const WEATHER_COLOR: [number, number, number] = NEON.netinfo
const WEATHER_ACCENT: [number, number, number] = NEON.mapaccent
const pad2 = (n) => String(n).padStart(2, "0")
const WD3 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const ch = (c) => String.fromCharCode(c)
const WXI = { sun: ch(0xe30d), part: ch(0xe302), cloud: ch(0xe312), rain: ch(0xe318), snow: ch(0xe31a), storm: ch(0xe31d), fog: ch(0xe313) }
const wxIcon = (desc) => {
 const d = desc.toLowerCase()
 if (/thunder|storm/.test(d)) return WXI.storm
 if (/snow|sleet|ice|blizzard/.test(d)) return WXI.snow
 if (/rain|drizzle|shower/.test(d)) return WXI.rain
 if (/fog|mist|haze/.test(d)) return WXI.fog
 if (/part|few/.test(d)) return WXI.part
 if (/cloud|overcast/.test(d)) return WXI.cloud
 return WXI.sun
}


let wxLat = 40.7128, wxLon = -74.006, wxName = "NEW YORK", wxFull = "NEW YORK"
let wxTemp = "--°", wxDesc = "—", wxFeels = "--°", wxHum = "--", wxWind = "--"
const WMO = { 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain", 81: "Rain", 82: "Heavy rain", 85: "Snow", 86: "Heavy snow", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" }
const forecast: { day: string; hi: string; lo: string; code: number; pop: number; hiN: number; loN: number; wind: number; uv: number; sunrise: string; sunset: string; date: string }[] = []
let areas: any[] = []
onColorChange(() => { areas.forEach(a => a?.queue_draw()) })


const WX_STORE = `${USER_DIR}/city.json`
const WX_DEFAULT = `${CYBER_DIR}/config/city.json`
const readWxStore = (): Uint8Array | null => {
 for (const p of [WX_STORE, WX_DEFAULT]) {
  try { const [ok, data] = GLib.file_get_contents(p); if (ok) return data } catch {}
 }
 return null
}
const saveWxLocation = () => {
 try {
  GLib.file_set_contents(WX_STORE, new TextEncoder().encode(JSON.stringify({ name: wxName, full: wxFull, lat: wxLat, lon: wxLon }, null, 2) + "\n"))
 } catch (e) { print("[cyber] wx save:", e) }
}
const loadWxLocation = () => {
 try {
 const data = readWxStore()
 if (data) {
 const o = JSON.parse(new TextDecoder().decode(data))
 if (typeof o.lat === "number" && typeof o.lon === "number") {
 wxLat = o.lat; wxLon = o.lon; wxName = String(o.name || wxName); wxFull = String(o.full || o.name || wxName)
 return
 }
 }
 } catch {}
}


const refreshWeather = async () => {
 try {
 const url = `https://api.open-meteo.com/v1/forecast?latitude=${wxLat}&longitude=${wxLon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset&forecast_days=7&timezone=auto`
 const j = JSON.parse(await execAsync(["curl", "-sf", "--max-time", "9", url]))
 const c = j.current
 if (c) { wxTemp = `${Math.round(c.temperature_2m)}°`; wxFeels = `${Math.round(c.apparent_temperature)}°`; wxDesc = WMO[c.weather_code] || "—"; wxHum = `${Math.round(c.relative_humidity_2m)}`; wxWind = `${Math.round(c.wind_speed_10m)}` }
 const dd = j.daily; forecast.length = 0
 if (dd && dd.time) for (let i = 0; i < dd.time.length && i < 7; i++) {
 const dt = new Date(dd.time[i] + "T12:00:00")
 const hiN = Math.round(dd.temperature_2m_max[i]), loN = Math.round(dd.temperature_2m_min[i])
 forecast.push({
 day: WD3[dt.getDay()], hi: `${hiN}°`, lo: `${loN}°`, hiN, loN,
 code: dd.weather_code?.[i] ?? 0, pop: dd.precipitation_probability_max?.[i] ?? 0,
 wind: Math.round(dd.wind_speed_10m_max?.[i] ?? 0), uv: Math.round(dd.uv_index_max?.[i] ?? 0),
 sunrise: (dd.sunrise?.[i] || "").slice(11, 16), sunset: (dd.sunset?.[i] || "").slice(11, 16),
 date: `${dt.getDate()} ${MON3[dt.getMonth()]}`,
 })
 }
 } catch (e) { wxDesc = "OFFLINE" }
 areas.forEach(a => a?.queue_draw())
 fcModal?.requestDraw()
}


let weatherInitialized = false
const ensureWeatherData = () => {
 if (weatherInitialized) return
 weatherInitialized = true
 loadWxLocation()
 interval(1_800_000, () => {
  if (areas.some(a => a.get_mapped()) || fcModal?.isOpen()) refreshWeather()
 })
 interval(60_000, () => { for (const area of areas) if (area.get_mapped()) area.queue_draw() })
}

const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const ordDay = (d) => { const j = d % 10, k = d % 100; return d + (j === 1 && k !== 11 ? "st" : j === 2 && k !== 12 ? "nd" : j === 3 && k !== 13 ? "rd" : "th") }
const fmtDate = (now) => `${ordDay(now.getDate())} ${MON3[now.getMonth()]}, ${now.getFullYear()}`

const MX0 = 14, MX1 = W - 14, MY1 = 70
const drawWeather = (ctx, now) => {
 tiltText(ctx, plane, MX0, 20, `${pad2(now.getHours())}:${pad2(now.getMinutes())}`, TITLE, 18, mapAccent.clock, 0.92, { bold: true })
 tiltText(ctx, plane, MX1, 20, wxName.slice(0, 24), TITLE, 10, mapAccent.city, 0.9, { align: "r", bold: true })
 const FORECOL = mapAccent.forecast || WEATHER_COLOR
 tiltText(ctx, plane, MX0 + 14, MY1 - 14, wxIcon(wxDesc), ICONF, 10, FORECOL, 0.95, { bold: true, glow: 0.3 })
 tiltText(ctx, plane, MX0 + 30, MY1 - 14, `${wxDesc.toUpperCase()} · ${wxTemp}`, TITLE, 9.5, FORECOL, 0.92, { bold: true, glow: 0.3 })
 tiltText(ctx, plane, MX0 + 2, MY1 + 16, `FEELS LIKE ${wxFeels} · HUM ${wxHum}% · WIND ${wxWind}`, MONO, 6.6, WEATHER_ACCENT, 0.52, { bold: true })
 tiltText(ctx, plane, MX1, 36, fmtDate(now), MONO, 9.5, FORECOL, 0.9, { bold: true, align: "r", glow: 0.38 })
 const fy = MY1 + 36
 fillQuad(ctx, plane, MX0 - 2, fy - 8, MX1 + 2, fy + 70, [0, 0, 0], 0.012)
 strokePath(ctx, plane, [[MX0 + 2, fy + 5], [MX1 - 2, fy + 5]], FORECOL, 0.16, 5)
 strokePath(ctx, plane, [[MX0 + 2, fy + 5], [MX1 - 2, fy + 5]], FORECOL, 0.62, 1)
 tiltText(ctx, plane, MX0, fy, "7-DAY FORECAST", TITLE, 9, FORECOL, 0.85, { bold: true, glow: 0.32 })
 tiltText(ctx, plane, MX1, fy, "L-CLICK \u25B8 DETAILS \u00B7 R \u25B8 CITY", MONO, 7, WEATHER_ACCENT, 0.38, { align: "r" })
 const span = (MX1 - MX0) / 7
 for (let i = 0; i < 7; i++) {
 const cx = MX0 + i * span + span / 2, d = forecast[i], today = i === 0
 if (today) fillQuad(ctx, plane, MX0 + i * span + 1, fy + 8, MX0 + (i + 1) * span - 1, fy + 66, FORECOL, 0.1)
 tiltText(ctx, plane, cx, fy + 20, d ? d.day : "--", TITLE, 9, today ? FORECOL : NEON.white, today ? 0.97 : 0.6, { align: "c", bold: true, glow: today ? 0.3 : 0 })
 tiltText(ctx, plane, cx, fy + 37, d ? wxIcon(WMO[d.code] || "") : "", ICONF, 13, today ? FORECOL : WEATHER_ACCENT, 0.85, { align: "c" })
 tiltText(ctx, plane, cx, fy + 51, d ? d.hi : "--", MONO, 10, today ? FORECOL : NEON.white, 0.9, { align: "c", bold: true })
 tiltText(ctx, plane, cx, fy + 63, d ? d.lo : "--", MONO, 8, WEATHER_ACCENT, 0.5, { align: "c" })
 }
}

export const WeatherPanel = (mon?: any) => {
 ensureWeatherData()
 const S = scaleOf(mon)
 const area = DrawingArea({})
 areas.push(area)
 area.set_size_request(Math.round(plane.width * S), Math.round(plane.height * S))
 area.connect("draw", (_w, ctx) => { ctx.scale(S, S); drawWeather(ctx, new Date()); return false })
 area.connect("map", () => refreshWeather())
 area.connect("destroy", () => { areas = areas.filter(a => a !== area) })
 const evt = EventBox({ child: Box({ className: "weather-panel", children: [area] }) })
 evt.add_events(Gdk.EventMask.BUTTON_PRESS_MASK)
 evt.connect("button-press-event", (_w, e) => {
  const btn = e.get_button?.()[1] ?? 0
  const coords = e.get_coords?.()
  const px = coords?.[1] / S, py = coords?.[2] / S
  const onClock = pip(px, py, projQuad(plane, MX0, 0, MX0 + 80, 30))
  if (btn === 3 && onClock) { openTimeModal(); return true }
  if (btn === 1) { openForecastModal(); return true }
  if (btn === 3) { openCityModal(); return true }
  return false
 })
 return evt
}

let wxModal: any = null
let wxQuery = "", wxResults: any[] = [], wxHint = "TYPE A CITY ▸", wxScroll = 0
let wxSearchTimer: number | null = null
const aPath = (ctx, x, y, w, h, c = 5) => { ctx.newPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c); ctx.closePath() }

const wxRunSearch = async () => {
 const q = wxQuery.trim()
 if (q.length < 2) { wxResults = []; wxHint = "TYPE A CITY ▸"; wxModal?.requestDraw(); return }
 wxHint = "SEARCHING…"; wxModal?.requestDraw()
 try {
 const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
 const data = JSON.parse(await execAsync(["curl", "-sf", "--max-time", "6", url]))
 wxResults = (data.results || []).map((r) => ({ lat: r.latitude, lon: r.longitude, name: r.name, full: [r.name, r.admin1, r.country].filter(Boolean).join(", ") }))
 wxHint = wxResults.length ? `${wxResults.length} MATCHES — CLICK ONE` : "NO MATCHES"
 } catch (e) { wxHint = "SEARCH FAILED"; print("[cyber] geocode:", e) }
 wxScroll = 0; wxModal?.requestDraw()
}
const wxQueueSearch = () => { if (wxSearchTimer !== null) GLib.source_remove(wxSearchTimer); wxSearchTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 340, () => { wxSearchTimer = null; wxRunSearch().catch(print); return false }) }
const wxPick = (r) => { wxLat = r.lat; wxLon = r.lon; wxName = String(r.name || "").toUpperCase(); wxFull = r.full.toUpperCase(); saveWxLocation(); refreshWeather(); wxModal.close() }

const ensureWxModal = () => {
 ensureWeatherData()
 if (wxModal) return
 wxModal = createModal({
 name: "weather", tabTitle: "WEATHER UPLINK", W: 384, H: 312, hud: true,
 onOpen: () => { wxQuery = ""; wxResults = []; wxHint = "TYPE A CITY ▸"; wxScroll = 0 },
 onKey: (k) => {
 if (k === Gdk.KEY_BackSpace) wxQuery = wxQuery.slice(0, -1)
 else { const u = Gdk.keyval_to_unicode(k); if (u >= 32 && u < 0x10000) wxQuery += String.fromCharCode(u); else return }
 wxQueueSearch(); wxModal.requestDraw()
 },
 onScroll: (d) => { wxScroll = Math.max(0, Math.min(Math.max(0, wxResults.length - 1), wxScroll + d)); wxModal.requestDraw() },
 draw: (ctx, g) => {
 const x = g.X + 18, w = g.w - 36
 gtxt(ctx, x + w - 4 - ctx.textExtents(`NOW: ${wxName}`).width, g.Y + GHEAD + 22, `NOW: ${wxName}`, GMONO, 9, GCYAN, 0.6)
 gtxt(ctx, x, g.Y + GHEAD + 22, "SEARCH FORECAST CITY", GMONO, 10, GCYAN, 0.85, 1)
 const by = g.Y + GHEAD + 32, bh = 30
 aPath(ctx, x, by, w, bh, 6); ctx.setSourceRGBA(GCYAN[0] * 0.12, GCYAN[1] * 0.06, GCYAN[2] * 0.06, 0.5); ctx.fill()
 aPath(ctx, x, by, w, bh, 6); ctx.setSourceRGBA(GCYAN[0], GCYAN[1], GCYAN[2], 0.85); ctx.setLineWidth(0.9); ctx.stroke()
 const cur = (Math.floor(Date.now() / 450) % 2) ? "▌" : " "
 gpango(ctx, x + 14, by + bh / 2 + 5, (wxQuery ? wxQuery + cur : "Search a city…"), GTITLE, false, 13, wxQuery ? GACC : GCYAN, wxQuery ? 0.96 : 0.4)
 gtxt(ctx, x, by + bh + 18, "// " + wxHint, GMONO, 9, GCYAN, 0.6)
 const ly = by + bh + 28, lh = (g.Y + g.h) - ly - 22, rowH = 30, gap = 5, step = rowH + gap, vis = Math.max(1, Math.floor(lh / step))
 const maxS = Math.max(0, wxResults.length - vis), sc = Math.min(wxScroll, maxS)
 ctx.save(); ctx.rectangle(x - 2, ly - 2, w + 4, lh + 4); ctx.clip()
 for (let i = 0; i <= vis; i++) {
 const idx = sc + i; if (idx >= wxResults.length) break
 const r = wxResults[idx], ry = ly + i * step; if (ry + rowH > ly + lh + step) break
 aPath(ctx, x, ry, w, rowH, 5); ctx.setSourceRGBA(GCYAN[0] * 0.16, GCYAN[1] * 0.08, GCYAN[2] * 0.08, 0.34); ctx.fill()
 aPath(ctx, x, ry, w, rowH, 5); ctx.setSourceRGBA(GCYAN[0], GCYAN[1], GCYAN[2], 0.6); ctx.setLineWidth(0.9); ctx.stroke()
 gpango(ctx, x + 14, ry + rowH / 2 + 4, r.full, GTITLE, true, 11, GACC, 0.95)
 g.push({ kind: "row", bx0: x, by0: ry, bx1: x + w, by1: ry + rowH, on: () => wxPick(r) })
 }
 ctx.restore()
 gtxt(ctx, x, g.Y + g.h - 10, "type ▸ click a result · ESC cancels", GMONO, 8, GCYAN, 0.42)
 },
 })
}
export const openCityModal = () => { ensureWxModal(); wxModal.toggle() }

let fcModal: any = null, fcSel = 0, fcTick = 0, fcOpenAt = 0, fcCityTap = 0
const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
const fcReveal = () => ease((Date.now() - fcOpenAt) / 620)

const YEL: [number, number, number] = USER.cyan
const ARA: [number, number, number] = GACC
const HOT: [number, number, number] = USER.red

const chamfer = (ctx, x, y, w, h, c = 11) => {
 ctx.newPath()
 ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c)
 ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.closePath()
}
const bracket = (ctx, x, y, w, h, col, a, len = 9) => {
 ctx.setSourceRGBA(col[0], col[1], col[2], a); ctx.setLineWidth(1.6)
 ctx.newPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke()
 ctx.newPath(); ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke()
 ctx.newPath(); ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h); ctx.stroke()
}
const hatch = (ctx, x, y, w, h, col, a, gap = 7) => {
 ctx.save(); ctx.rectangle(x, y, w, h); ctx.clip()
 ctx.setSourceRGBA(col[0], col[1], col[2], a); ctx.setLineWidth(0.8)
 for (let i = -h; i < w; i += gap) { ctx.newPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke() }
 ctx.restore()
}
const ghost = (ctx, x, y, s, font, size, a = 0.4) => {
 gtxt(ctx, x - 2, y + 1.2, s, font, size, HOT, a, 1)
}

const fcCard = (ctx, g, d, i, x, y, w, h, sel, rv) => {
 const col = sel ? YEL : ARA
 chamfer(ctx, x, y, w, h, 12)
 ctx.setSourceRGBA(col[0] * 0.22, col[1] * 0.3, col[2] * 0.36, sel ? 0.26 : 0.09); ctx.fill()
 chamfer(ctx, x, y, w, h, 12)
 ctx.setSourceRGBA(col[0], col[1], col[2], sel ? 0.95 : 0.26); ctx.setLineWidth(sel ? 1.4 : 0.9); ctx.stroke()
 if (sel) { ctx.setSourceRGBA(YEL[0], YEL[1], YEL[2], 0.72 + 0.28 * Math.sin(fcTick / 7)); ctx.rectangle(x, y, w, 3); ctx.fill() }
 const cw2 = (s, font, size, bold) => { ctx.selectFontFace(font, 0, bold ? 1 : 0); ctx.setFontSize(size); return ctx.textExtents(s).width }
 const fit = (s, font, size, bold, max) => { let sz = size; while (sz > 8 && cw2(s, font, sz, bold) > max) sz -= 0.5; return sz }
 gtxt(ctx, x + 5, y + 15, `0${i + 1}`, GMONO, 7, sel ? YEL : ARA, sel ? 0.75 : 0.35)
 gtxt(ctx, x + w / 2 - cw2(d ? d.day : "--", GTITLE, 12, true) / 2, y + 30, d ? d.day : "--", GTITLE, 12, sel ? YEL : ARA, sel ? 1 : 0.75, 1, sel ? 0.45 : 0)
 gtxt(ctx, x + w / 2 - cw2(d ? d.date : "", GMONO, 8.5, true) / 2, y + 43, d ? d.date : "", GMONO, 8.5, sel ? YEL : ARA, sel ? 0.95 : 0.72, 1)
 if (!d) return
 gpango(ctx, x + w / 2 - 13, y + 76, wxIcon(WMO[d.code] || ""), ICONF, false, 25, sel ? YEL : ARA, sel ? 0.98 : 0.6)
 const hs = fit(d.hi, GTITLE, 17, true, w - 14), hw = cw2(d.hi, GTITLE, hs, true)
 if (sel) ghost(ctx, x + w / 2 - hw / 2, y + 102, d.hi, GTITLE, hs, 0.45)
 gtxt(ctx, x + w / 2 - hw / 2, y + 102, d.hi, GTITLE, hs, sel ? YEL : ARA, 0.97, 1, sel ? 0.4 : 0)
 gtxt(ctx, x + w / 2 - cw2(d.lo, GMONO, 10, false) / 2, y + 117, d.lo, GMONO, 10, ARA, 0.5)
 const segs = 7, sh = 4, sg = 2, bx = x + 8, bw = w - 16
 const on = Math.round((d.pop / 100) * segs * rv)
 const sw2 = (bw - sg * (segs - 1)) / segs
 for (let s = 0; s < segs; s++) {
 const lit = s < on
 ctx.setSourceRGBA(lit ? YEL[0] : ARA[0], lit ? YEL[1] : ARA[1], lit ? YEL[2] : ARA[2], lit ? 0.92 : 0.13)
 ctx.rectangle(bx + s * (sw2 + sg), y + h - 26, sw2, sh); ctx.fill()
 }
 gtxt(ctx, x + w / 2 - cw2(`${d.pop}%`, GMONO, 7.5, false) / 2, y + h - 10, `${d.pop}%`, GMONO, 7.5, d.pop > 0 ? YEL : ARA, d.pop > 0 ? 0.8 : 0.45)
}

const fcCurve = (ctx, days, x, y, w, h, rv) => {
 if (days.length < 2) return
 const his = days.map(d => d.hiN), los = days.map(d => d.loN)
 const mx = Math.max(...his) + 2, mn = Math.min(...los) - 2, rg = Math.max(1, mx - mn)
 const px = (i) => x + (i / (days.length - 1)) * w
 const py = (v) => y + h - ((v - mn) / rg) * h
 const n = Math.max(2, Math.ceil(days.length * rv))
 ctx.newPath(); ctx.moveTo(px(0), y + h)
 for (let i = 0; i < n; i++) ctx.lineTo(px(i), py(his[i]))
 ctx.lineTo(px(n - 1), y + h); ctx.closePath()
 ctx.setSourceRGBA(YEL[0], YEL[1], YEL[2], 0.07); ctx.fill()
 ctx.setSourceRGBA(ARA[0], ARA[1], ARA[2], 0.16); ctx.setLineWidth(0.8)
 for (let i = 0; i < n; i++) { ctx.newPath(); ctx.moveTo(px(i), py(his[i])); ctx.lineTo(px(i), y + h); ctx.stroke() }
 for (const [vals, cc, aa, lw] of [[los, ARA, 0.5, 1.2], [his, YEL, 0.95, 1.9]] as any) {
 ctx.newPath()
 for (let i = 0; i < n; i++) { const X = px(i), Y = py(vals[i]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y) }
 ctx.setSourceRGBA(cc[0], cc[1], cc[2], aa); ctx.setLineWidth(lw); ctx.stroke()
 for (let i = 0; i < n; i++) {
 const X = px(i), Y = py(vals[i])
 ctx.setSourceRGBA(cc[0], cc[1], cc[2], aa)
 ctx.rectangle(X - 2.4, Y - 2.4, 4.8, 4.8); ctx.fill()
 }
 }
 gtxt(ctx, x - 12, y + 6, `${Math.round(mx)}`, GMONO, 7, ARA, 0.4)
 gtxt(ctx, x - 12, y + h, `${Math.round(mn)}`, GMONO, 7, ARA, 0.4)
}

const ensureForecastModal = () => {
 ensureWeatherData()
 if (fcModal) return
 fcModal = createModal({
 name: "forecast", tabTitle: "ATMOSPHERIC UPLINK · 7-DAY", W: 940, H: 480,
 col: GCYAN, accent: GACC, yaw: -29, pitch: -5, roll: -0.4, focal: 2400, dist: 2300, glass: 0.88, anchorLeft: true, keymode: Keymode.ON_DEMAND,
 onOpen: () => { fcSel = 0; fcTick = 0; fcOpenAt = Date.now(); refreshWeather() },
 onFrame: () => { fcTick++; fcModal.requestDraw() },
 onKey: (k) => {
 if (k === Gdk.KEY_Left) fcSel = Math.max(0, fcSel - 1)
 else if (k === Gdk.KEY_Right) fcSel = Math.min(Math.max(0, forecast.length - 1), fcSel + 1)
 else return
 fcModal.requestDraw()
 },
 draw: (ctx, g) => {
 const rv = fcReveal(), d = forecast[fcSel]
 const x0 = g.X + 18, y0 = g.Y + GHEAD + 6, lw = 250
 gtxt(ctx, x0, y0 + 12, (wxFull || wxName).slice(0, 34).toUpperCase(), GTITLE, 11, YEL, 0.95, 1, 0.35)
 gtxt(ctx, x0, y0 + 27, `${Math.abs(wxLat).toFixed(3)}°${wxLat >= 0 ? "N" : "S"} ${Math.abs(wxLon).toFixed(3)}°${wxLon >= 0 ? "E" : "W"}`, GMONO, 8, ARA, 0.45)
 g.push({ kind: "city", bx0: x0 - 6, by0: y0 - 2, bx1: x0 + lw, by1: y0 + 32, on: () => {
 const t = Date.now()
 if (t - fcCityTap < 450) { fcCityTap = 0; fcModal.close(); openCityModal() } else fcCityTap = t
 } })

 chamfer(ctx, x0, y0 + 36, lw, 128, 14)
 ctx.setSourceRGBA(ARA[0] * 0.24, ARA[1] * 0.34, ARA[2] * 0.42, 0.16); ctx.fill()
 hatch(ctx, x0 + lw - 54, y0 + 36, 54, 26, ARA, 0.10)
 chamfer(ctx, x0, y0 + 36, lw, 128, 14)
 ctx.setSourceRGBA(ARA[0], ARA[1], ARA[2], 0.42); ctx.setLineWidth(1); ctx.stroke()
 bracket(ctx, x0 + 4, y0 + 40, lw - 8, 120, YEL, 0.5)
 if (d) {
 gpango(ctx, x0 + 16, y0 + 104, wxIcon(WMO[d.code] || ""), ICONF, false, 46, YEL, 0.95)
 ghost(ctx, x0 + 88, y0 + 100, d.hi, GTITLE, 44, 0.4)
 gpango(ctx, x0 + 88, y0 + 100, d.hi, GTITLE, true, 44, YEL, 0.98)
 gtxt(ctx, x0 + 88, y0 + 122, `LOW ${d.lo}`, GMONO, 10, ARA, 0.6)
 gtxt(ctx, x0 + 16, y0 + 132, (WMO[d.code] || "—").toUpperCase(), GTITLE, 11, ARA, 0.8, 1)
 gtxt(ctx, x0 + 16, y0 + 152, `${d.day} · ${d.date}`, GMONO, 9, ARA, 0.5)
 }
 const rows: [string, string][] = d ? [
 ["PRECIPITATION", `${d.pop}%`], ["WIND MAX", `${d.wind} km/h`], ["UV INDEX", `${d.uv}`],
 ["SUNRISE", d.sunrise || "--:--"], ["SUNSET", d.sunset || "--:--"],
 ] : []
 let ry = y0 + 186
 for (const [k, v] of rows) {
 ctx.setSourceRGBA(ARA[0], ARA[1], ARA[2], 0.14)
 ctx.newPath(); ctx.moveTo(x0, ry + 6); ctx.lineTo(x0 + lw, ry + 6); ctx.setLineWidth(1); ctx.stroke()
 ctx.setSourceRGBA(YEL[0], YEL[1], YEL[2], 0.55)
 ctx.rectangle(x0, ry - 6, 2, 8); ctx.fill()
 gtxt(ctx, x0 + 8, ry, k, GMONO, 9, ARA, 0.55)
 gtxt(ctx, x0 + lw - ctx.textExtents(v).width, ry, v, GTITLE, 11, YEL, 0.92, 1)
 ry += 24
 }
 ctx.setSourceRGBA(YEL[0], YEL[1], YEL[2], 0.85)
 ctx.rectangle(x0, y0 + 308, 22, 2); ctx.fill()
 gtxt(ctx, x0 + 28, y0 + 312, "// LIVE", GMONO, 8, YEL, 0.7)
 gtxt(ctx, x0, y0 + 334, `${wxTemp}  ${wxDesc.toUpperCase()}`, GTITLE, 13, YEL, 0.9, 1, 0.25)
 gtxt(ctx, x0, y0 + 350, `FEELS ${wxFeels} · HUM ${wxHum}% · WIND ${wxWind}`, GMONO, 8.5, ARA, 0.5)

 const rx = x0 + lw + 26, rw = (g.X + g.w) - rx - 18
 const cw = rw / 7, ch = 182
 for (let i = 0; i < 7; i++) {
 const cx = rx + i * cw + 3, d2 = forecast[i]
 fcCard(ctx, g, d2, i, cx, y0 + 10, cw - 6, ch, i === fcSel, rv)
 g.push({ kind: "day", bx0: cx, by0: y0 + 10, bx1: cx + cw - 6, by1: y0 + 10 + ch, on: () => { fcSel = i; fcModal.requestDraw() } })
 }
 const gy = y0 + ch + 34, gh = 140
 ctx.setSourceRGBA(YEL[0], YEL[1], YEL[2], 0.85)
 ctx.rectangle(rx, gy - 14, 14, 2); ctx.fill()
 gtxt(ctx, rx + 20, gy - 10, "// THERMAL TREND · 7 DAYS", GMONO, 8.5, YEL, 0.7)
 ctx.setSourceRGBA(ARA[0], ARA[1], ARA[2], 0.07)
 for (let i = 0; i <= 4; i++) { const yy = gy + (gh / 4) * i; ctx.newPath(); ctx.moveTo(rx, yy); ctx.lineTo(rx + rw - 6, yy); ctx.setLineWidth(1); ctx.stroke() }
 fcCurve(ctx, forecast, rx + 14, gy, rw - 34, gh, rv)
 gtxt(ctx, g.X + 18, g.Y + g.h - 10, "click a day · double-click the city to change it · ESC closes", GMONO, 8, ARA, 0.45)
 },
 })
}
export const openForecastModal = () => { ensureForecastModal(); fcModal.toggle() }
