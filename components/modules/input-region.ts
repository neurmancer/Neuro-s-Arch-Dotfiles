export type InputRect = { x: number, y: number, width: number, height: number }

// Scan convert fixed widget outlines once, without drawing or reading pixels.
export const polygonRects = (points: number[][]): InputRect[] => {
    const rects: InputRect[] = []
    const top = Math.floor(Math.min(...points.map(p => p[1])))
    const bottom = Math.ceil(Math.max(...points.map(p => p[1])))
    for (let y = top; y < bottom; y++) {
        const xs: number[] = []
        for (let i = 0; i < points.length; i++) {
            const a = points[i], b = points[(i + 1) % points.length], scan = y + 0.5
            if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan))
                xs.push(a[0] + (scan - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
        }
        xs.sort((a, b) => a - b)
        for (let i = 0; i + 1 < xs.length; i += 2) {
            const x = Math.ceil(xs[i]), width = Math.floor(xs[i + 1]) - x
            if (width <= 0) continue
            const last = rects[rects.length - 1]
            if (last && last.x === x && last.width === width && last.y + last.height === y) last.height++
            else rects.push({ x, y, width, height: 1 })
        }
    }
    return rects
}

export const clipRects = (rects: InputRect[], clip: InputRect): InputRect[] => rects.flatMap(r => {
    const x = Math.max(r.x, clip.x), y = Math.max(r.y, clip.y)
    const width = Math.min(r.x + r.width, clip.x + clip.width) - x
    const height = Math.min(r.y + r.height, clip.y + clip.height) - y
    return width > 0 && height > 0 ? [{ x, y, width, height }] : []
})

// Custom canvases supply their outlines; ordinary leaves use their allocation.
// Clipping at every ancestor also handles partially revealed GTK children.
export const widgetInputRects = (widget: any, relativeTo: any): InputRect[] => {
    if (!widget.get_visible() || !widget.get_mapped()) return []
    const [ok, x, y] = widget.translate_coordinates(relativeTo, 0, 0)
    if (!ok) return []
    const bounds = { x, y, width: widget.get_allocated_width(), height: widget.get_allocated_height() }
    if (widget._hudInputRects)
        return clipRects(widget._hudInputRects().map(r => ({ ...r, x: r.x + x, y: r.y + y })), bounds)
    if (widget.get_children)
        return clipRects(widget.get_children().flatMap(child => widgetInputRects(child, relativeTo)), bounds)
    return [bounds]
}
