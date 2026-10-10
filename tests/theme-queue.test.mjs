import test from 'node:test'
import assert from 'node:assert/strict'
import { latestTask } from '../components/modules/latest-task.ts'
const gate = () => { let release; const promise = new Promise(r => release = r); return { promise, release } }

test('rapid selections skip queued palettes and stale follow-up stages', async () => {
    const blocked = gate(), entered = gate(), calls = []
    const request = latestTask(async (name, current) => {
        calls.push(name)
        if (name === 'A') { entered.release(); await blocked.promise }
        if (current()) calls.push(name + '-kitty')
    })
    const a = request('A'); await entered.promise
    const b = request('B'), c = request('C')
    blocked.release()
    assert.deepEqual(await Promise.all([a, b, c]), [false, false, true])
    assert.deepEqual(calls, ['A', 'C', 'C-kitty'])
})

test('a slow wallpaper does not block newer colors', async () => {
    const blocked = gate(), entered = gate(), colors = []
    const wall = latestTask(async () => { entered.release(); await blocked.promise })
    const color = latestTask(async name => { colors.push(name) })
    const pending = wall('A'); await entered.promise
    await color('A'); await color('B')
    assert.deepEqual(colors, ['A', 'B'])
    blocked.release(); await pending
})

test('obsolete failure is silent and latest failure is surfaced; later requests recover', async () => {
    const blocked = gate(), entered = gate()
    const request = latestTask(async name => {
        if (name === 'old') { entered.release(); await blocked.promise }
        if (name !== 'good') throw new Error(name)
    })
    const old = request('old'); await entered.promise
    const good = request('good'); blocked.release()
    assert.equal(await old, false); assert.equal(await good, true)
    await assert.rejects(request('bad'), /bad/)
    assert.equal(await request('good'), true)
})

test('reselecting the same palette uses request identity, not just its name', async () => {
    const blocked = gate(), entered = gate()
    let count = 0
    const request = latestTask(async () => {
        if (++count === 1) { entered.release(); await blocked.promise }
    })
    const first = request('A'); await entered.promise
    const second = request('A'); blocked.release()
    assert.equal(await first, false); assert.equal(await second, true)
})
