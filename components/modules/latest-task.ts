// Serialize shared writers, skipping superseded work and ignoring stale failures.
// Separate queues keep slow wallpaper startup out of the color application path.
export const latestTask = <T>(run: (value: T, current: () => boolean) => Promise<void>) => {
    let generation = 0
    let tail: Promise<unknown> = Promise.resolve()
    return (value: T): Promise<boolean> => {
        const id = ++generation
        const current = () => id === generation
        const result = tail.catch(() => {}).then(async () => {
            if (!current()) return false
            try { await run(value, current) }
            catch (error) { if (current()) throw error }
            return current()
        })
        tail = result
        return result
    }
}
