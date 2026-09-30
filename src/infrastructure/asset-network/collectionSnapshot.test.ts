import { describe, expect, it, vi } from 'vitest'
import { compareCollectionSnapshot, createCollectionSnapshot } from '../../workspace/collectionSnapshot'
import { collectionSnapshotAdapter as adapter } from './collectionSnapshot'
import { seedInterventionCollection, reviseInspection } from './interventionCollection'
import type { InterventionCollection } from './interventionCollection'
import { initialIntervention } from './interventionLedger'

const key = 'civicworks:intervention-collection:v1'
const legacyKey = 'civicworks:road-142:intervention:v1'
const createdAt = '2026-09-30T12:00:00.000Z'
const seed = seedInterventionCollection()
function storage(entries: [string, string][] = [[key, JSON.stringify(seed)]]) {
  const values = new Map(entries)
  const setItem = vi.fn((name: string, raw: string) => { values.set(name, raw) })
  return { values, setItem, getItem: (name: string) => values.get(name) ?? null }
}
function envelope(payload: unknown, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ format: 'collection-snapshot', version: 1, product: adapter.product,
    scope: adapter.scope, createdAt, payload, ...extra })
}

describe('CivicWorks read-only collection snapshots', () => {
  it('exports the complete domain payload, including archives and metadata, without writes', () => {
    const value = { ...seed, futureMetadata: { retained: true } }
    const port = storage([[key, JSON.stringify(value)], [legacyKey, 'legacy bytes'], ['unrelated', 'private bytes']])
    const before = [...port.values]
    const exported: unknown = JSON.parse(createCollectionSnapshot(adapter, port, createdAt))
    expect(exported).toMatchObject({ format: 'collection-snapshot', version: 1, product: 'CivicWorks',
      scope: adapter.scope, createdAt, payload: value })
    expect(seed.interventions.some(record => record.archived)).toBe(true)
    expect([...port.values]).toEqual(before)
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it('compares primary records and keyed sources without treating history as uniquely keyed rows', () => {
    const port = storage()
    const groups = adapter.groups(seed)
    expect(groups.map(group => group.key)).toEqual(['interventions', 'inspections'])
    const comparison = compareCollectionSnapshot(createCollectionSnapshot(adapter, port, createdAt), adapter, port)
    expect(comparison.rows).toHaveLength(seed.interventions.length + seed.inspections.length)
    expect(comparison.rows.every(row => row.status === 'unchanged')).toBe(true)
    expect(comparison.payloadChanged).toBe(false)
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it.each([
    ['null primary record', { ...seed, interventions: [null] }],
    ['malformed related source', { ...seed, inspections: [null] }],
    ['duplicate identity', { ...seed, interventions: [seed.interventions[0], seed.interventions[0]] }],
    ['malformed nested ledger', { ...seed, interventions: [{ ...seed.interventions[0], ledger: { revision: -1 } }] }],
  ])('rejects %s in uploaded payload without touching any saved entry', (_name, candidate) => {
    const port = storage([[key, JSON.stringify(seed)], [legacyKey, 'legacy bytes'], ['unrelated', 'private bytes']])
    const before = [...port.values]
    expect(() => compareCollectionSnapshot(envelope(candidate), adapter, port)).toThrow()
    expect([...port.values]).toEqual(before)
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it.each([{ product: 'OtherProduct' }, { scope: 'other-collection' }, { version: 2 }, { format: 'raw-recovery' }])(
    'rejects incompatible envelope %j', extra => {
      const port = storage()
      expect(() => compareCollectionSnapshot(envelope(seed, extra), adapter, port)).toThrow()
      expect(port.setItem).not.toHaveBeenCalled()
    })

  it('detects changes from a real source transition while preserving valid blocked work', () => {
    const candidate = reviseInspection(seed, 'INS-N-4', 1).collection
    const port = storage()
    const before = [...port.values]
    const comparison = compareCollectionSnapshot(envelope(candidate), adapter, port)
    expect(comparison.payloadChanged).toBe(true)
    expect(comparison.rows.filter(row => row.status === 'changed')).toHaveLength(4)
    expect([...port.values]).toEqual(before)
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it('detects history-only differences without inventing duplicate record identities', () => {
    const candidate: InterventionCollection = { ...seed, audit: [{ action: 'inspection-reviewed', id: 'ROAD-142', related: [] }, { action: 'inspection-reviewed', id: 'ROAD-142', related: [] }] }
    const port = storage()
    const comparison = compareCollectionSnapshot(envelope(candidate), adapter, port)
    expect(comparison.payloadChanged).toBe(true)
    expect(comparison.rows.every(row => row.status === 'unchanged')).toBe(true)
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it('does not hide unknown metadata-only differences', () => {
    const port = storage()
    const comparison = compareCollectionSnapshot(envelope({ ...seed, futureMetadata: { retained: true } }), adapter, port)
    expect(comparison.payloadChanged).toBe(true)
    expect(comparison.rows.every(row => row.status === 'unchanged')).toBe(true)
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it('reads a valid legacy source without materializing or modifying collection storage', () => {
    const legacy = JSON.stringify(initialIntervention)
    const port = storage([[legacyKey, legacy]])
    const raw = createCollectionSnapshot(adapter, port, createdAt)
    expect(compareCollectionSnapshot(raw, adapter, port).payloadChanged).toBe(false)
    expect([...port.values]).toEqual([[legacyKey, legacy]])
    expect(port.setItem).not.toHaveBeenCalled()
  })

  it('refuses to export or compare against malformed current data without resetting it', () => {
    const port = storage([[key, '{broken'], [legacyKey, JSON.stringify(initialIntervention)]])
    const before = [...port.values]
    expect(() => createCollectionSnapshot(adapter, port, createdAt)).toThrow()
    expect(() => compareCollectionSnapshot(envelope(seed), adapter, port)).toThrow()
    expect([...port.values]).toEqual(before)
    expect(port.setItem).not.toHaveBeenCalled()
  })
})
