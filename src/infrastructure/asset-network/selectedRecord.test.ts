import { describe, expect, it } from 'vitest'
import type { StoragePort } from '../../workspace/repository'
import { saveCurrentCollection } from '../../workspace/recordStorage'
import { openSelectedRecord } from './selectedRecord'
import { readInterventionCollection, saveInterventionCollection } from './interventionCollection'
import { readIntervention, saveIntervention, changePermit } from './interventionLedger'

class MemoryStorage implements StoragePort {
  data = new Map<string, string>()
  fail = false
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, raw: string) { if (this.fail) throw new Error('Storage full'); this.data.set(key, raw) }
}
const edit: (state: ReturnType<typeof readIntervention>) => ReturnType<typeof readIntervention> = state => changePermit(state, 'ROAD-142', 'approved')
const key = 'civicworks:road-142:intervention:v1'
describe('selected intervention persistence', () => {
  it('preserves the primary migration source when a secondary record opens first', () => {
    const storage = new MemoryStorage()
    const before = readInterventionCollection(storage)
    const peer = before.interventions[1]
    if (!peer) throw new Error('Secondary fixture missing')
    const bound = openSelectedRecord(storage, peer.id)
    expect(readInterventionCollection(bound)).toEqual(before)
    expect(storage.data.size).toBe(0)
  })
  it('imports legacy history once and retains its original backup', () => {
    const storage = new MemoryStorage()
    const legacy = edit(readIntervention(storage))
    saveIntervention(storage, legacy)
    const backup = storage.getItem(key)
    const bound = openSelectedRecord(storage)
    expect(readIntervention(bound)).toEqual(legacy)
    saveIntervention(bound, legacy)
    expect(readInterventionCollection(storage).interventions[0]?.ledger).toEqual(legacy)
    expect(storage.getItem(key)).toBe(backup)
    saveIntervention(storage, readIntervention(new MemoryStorage()))
    expect(readIntervention(openSelectedRecord(storage))).toEqual(legacy)
  })
  it('persists a domain action and preserves every unrelated record', () => {
    const storage = new MemoryStorage(), before = readInterventionCollection(storage)
    const bound = openSelectedRecord(storage), changed = edit(readIntervention(bound))
    saveIntervention(bound, changed)
    const after = readInterventionCollection(storage)
    expect(after.interventions[0]?.ledger).toEqual(changed)
    expect(after.interventions.slice(1)).toEqual(before.interventions.slice(1))
    expect(readIntervention(openSelectedRecord(storage))).toEqual(changed)
    expect(after.audit.at(-1)).toMatchObject({ action: 'detail-updated', id: 'ROAD-142' })
  })
  it('rejects stale edits without replacing the newer domain state', () => {
    const storage = new MemoryStorage()
    const first = openSelectedRecord(storage), stale = openSelectedRecord(storage)
    const changed = edit(readIntervention(first))
    saveIntervention(first, changed)
    expect(() => saveIntervention(stale, edit(readIntervention(stale)))).toThrow('changed in another view')
    expect(readIntervention(openSelectedRecord(storage))).toEqual(changed)
  })
  it('merges with an unrelated record archive without losing that edit', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const before = readInterventionCollection(storage), peer = before.interventions[1]
    if (!peer) throw new Error('Peer fixture missing')
    const newer = { ...before, interventions: before.interventions.map(item => item.id === peer.id ? { ...item, archived: true } : item) }
    saveInterventionCollection(storage, newer)
    saveIntervention(bound, edit(readIntervention(bound)))
    expect(readInterventionCollection(storage).interventions[1]).toEqual(newer.interventions[1])
  })
  it('rejects missing and archived targets without writing', () => {
    const storage = new MemoryStorage()
    expect(() => openSelectedRecord(storage, 'missing')).toThrow('not found')
    expect(storage.data.size).toBe(0)
    const before = readInterventionCollection(storage)
    saveInterventionCollection(storage, { ...before, interventions: before.interventions.map(item => ({ ...item, archived: true })) })
    const snapshot = [...storage.data]
    expect(() => openSelectedRecord(storage)).toThrow('archived')
    expect([...storage.data]).toEqual(snapshot)
  })
  it('rejects a record archived after the editor opened', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const before = readInterventionCollection(storage)
    saveInterventionCollection(storage, { ...before, interventions: before.interventions.map(item => ({ ...item, archived: true })) })
    expect(() => saveIntervention(bound, edit(readIntervention(bound)))).toThrow('changed in another view')
  })
  it('preserves retryability after a recoverable storage failure', () => {
    const storage = new MemoryStorage(), bound = openSelectedRecord(storage)
    const changed = edit(readIntervention(bound))
    storage.fail = true
    expect(() => saveIntervention(bound, changed)).toThrow('Storage full')
    storage.fail = false
    saveIntervention(bound, changed)
    expect(readIntervention(openSelectedRecord(storage))).toEqual(changed)
  })
  it('protects a detail edit against a stale whole-workspace save', () => {
    const storage = new MemoryStorage(), stale = readInterventionCollection(storage)
    const bound = openSelectedRecord(storage)
    saveIntervention(bound, edit(readIntervention(bound)))
    expect(() => saveCurrentCollection(storage, stale, stale, readInterventionCollection, saveInterventionCollection)).toThrow('Workspace changed')
    expect(readInterventionCollection(storage).interventions[0]?.ledger).not.toEqual(stale.interventions[0]?.ledger)
  })
})
