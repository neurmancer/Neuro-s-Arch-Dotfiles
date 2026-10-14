import GLib from "gi://GLib"

type CpuSample = { total: number, idle: number }
export type SystemSample = { cpu: number | null, memory: { used: number, total: number } | null }

export const parseCpuSample = (text: string): CpuSample | null => {
    const line = text.split("\n").find(line => /^cpu\s/.test(line))
    if (!line) return null
    // Guest time is already included in user/nice: only sum the first eight fields.
    const fields = line.trim().split(/\s+/).slice(1, 9).map(Number)
    if (fields.length < 4 || fields.some(n => !Number.isFinite(n) || n < 0)) return null
    return { total: fields.reduce((a, b) => a + b, 0), idle: fields[3] + (fields[4] || 0) }
}

export const cpuFraction = (previous: CpuSample | null, current: CpuSample | null): number | null => {
    if (!previous || !current) return null
    const total = current.total - previous.total, idle = current.idle - previous.idle
    if (total <= 0 || idle < 0 || idle > total) return null
    return Math.max(0, Math.min(1, 1 - idle / total))
}

export const parseMemorySample = (text: string): SystemSample["memory"] => {
    const total = /^MemTotal:\s+(\d+)\s+kB\s*$/m.exec(text)
    const available = /^MemAvailable:\s+(\d+)\s+kB\s*$/m.exec(text)
    if (!total || !available || Number(total[1]) <= 0) return null
    return { total: Number(total[1]), used: Math.max(0, Number(total[1]) - Number(available[1])) }
}

const read = (path: string): string => {
    try {
        const [ok, bytes] = GLib.file_get_contents(path)
        return ok ? new TextDecoder().decode(bytes) : ""
    } catch { return "" }
}

// One small /proc sample for all visible monitors; no processes or idle polling.
const listeners = new Set<(sample: SystemSample) => void>()
let timer = 0
let previous: CpuSample | null = null
let latest: SystemSample = { cpu: null, memory: null }
const publish = (listener: (sample: SystemSample) => void) => {
    try { listener(latest) } catch (e) { print("[system-tray] sample:", e) }
}
const sample = () => {
    const current = parseCpuSample(read("/proc/stat"))
    latest = { cpu: cpuFraction(previous, current), memory: parseMemorySample(read("/proc/meminfo")) }
    previous = current
    for (const listener of listeners) publish(listener)
}
export const subscribeSystemStats = (listener: (sample: SystemSample) => void): (() => void) => {
    listeners.add(listener)
    if (!timer) {
        sample()
        timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            sample()
            return GLib.SOURCE_CONTINUE
        })
    } else publish(listener)
    return () => {
        listeners.delete(listener)
        if (listeners.size || !timer) return
        GLib.source_remove(timer)
        timer = 0
        previous = null
        latest = { cpu: null, memory: null }
    }
}
