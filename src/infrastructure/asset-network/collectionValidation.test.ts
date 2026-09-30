import { describe, expect, it } from 'vitest'
import { StoredDataError } from '../../workspace/storageValidation'
import { readInterventionCollection, saveInterventionCollection, seedInterventionCollection } from './interventionCollection'
import type { InterventionCollection } from './interventionCollection'
import { adoptFunding, initialIntervention, invalidateInspection, reinspect } from './interventionLedger'

const key = 'civicworks:intervention-collection:v1'
const legacyKey = 'civicworks:road-142:intervention:v1'
function storage(entries: [string, string][] = []) {
  const values = new Map(entries), writes: string[] = []
  return { values, writes, getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, raw: string) => { writes.push(name); values.set(name, raw) } }
}
const seed = seedInterventionCollection(), first = seed.interventions[0]!, ready = seed.interventions[1]!, asset = first.ledger.network[0]!
const replace = (record: unknown) => ({ ...seed, interventions: [record] })
describe('intervention collection integrity', () => {
  it.each([
    ['null record', replace(null)], ['missing ledger', replace({ ...first, ledger: {} })],
    ['fractional revision', replace({ ...first, ledger: { ...first.ledger, inspectionRevision: 0.5 } })],
    ['asset kind enum', replace({ ...first, ledger: { ...first.ledger, network: [{ ...asset, kind: 'unknown' }] } })],
    ['permit enum', replace({ ...first, ledger: { ...first.ledger, network: [{ ...asset, permit: 'expired' }] } })],
    ['condition type', replace({ ...first, ledger: { ...first.ledger, network: [{ ...asset, condition: '42' }] } })],
    ['invalid inspection date', replace({ ...first, ledger: { ...first.ledger, network: [{ ...asset, inspectionDue: '2026-02-31' }] } })],
    ['invalid dependency identity', replace({ ...first, ledger: { ...first.ledger, network: [{ ...asset, dependsOn: [null] }] } })],
    ['review enum', replace({ ...ready, ledger: { ...ready.ledger, fundingReviews: [{ ...ready.ledger.fundingReviews?.[0], status: 'unknown' }] } })],
    ['null history event', replace({ ...first, ledger: { ...first.ledger, history: [null] } })],
    ['duplicate interventions', { ...seed, interventions: [first, first] }],
    ['duplicate network identities', replace({ ...first, ledger: { ...first.ledger, network: [asset, asset] } })],
    ['duplicate source identities', { ...seed, inspections: [seed.inspections[0], seed.inspections[0]] }],
    ['invalid source references', { ...seed, inspections: [{ ...seed.inspections[0], interventionIds: [null] }] }],
    ['invalid audit entry', { ...seed, audit: [{ action: 'updated', id: first.id, related: 'not-an-array' }] }],
  ])('rejects %s without touching saved bytes', (_name, value) => {
    const raw = JSON.stringify(value), port = storage([[key, raw]])
    expect(() => readInterventionCollection(port)).toThrow(StoredDataError)
    expect(port.values.get(key)).toBe(raw)
    expect(port.writes).toEqual([])
  })
  it.each(['', '{', 'null'])('does not seed over unreadable primary data %j', raw => {
    const port = storage([[key, raw]])
    expect(() => readInterventionCollection(port)).toThrow(StoredDataError)
    expect(port.values.get(key)).toBe(raw)
    expect(port.writes).toEqual([])
  })
  it('preserves metadata and omitted optional review work in a valid round trip', () => {
    const port = storage(), value = { ...seed, importMetadata: { batch: 'offline-copy', retained: true },
      interventions: [{ ...first, localNote: 'retained', ledger: { ...first.ledger, fundingReviews: undefined } }] }
    saveInterventionCollection(port, value)
    expect(readInterventionCollection(port)).toEqual(JSON.parse(JSON.stringify(value)))
    expect(port.writes).toEqual([key])
  })
  it('validates before writing an invalid runtime candidate', () => {
    const raw = JSON.stringify(seed), port = storage([[key, raw]])
    expect(() => saveInterventionCollection(port, replace(null) as unknown as InterventionCollection)).toThrow(StoredDataError)
    expect(port.values.get(key)).toBe(raw)
    expect(port.writes).toEqual([])
  })
  it('normalizes a valid legacy ledger without modifying either storage key', () => {
    const raw = JSON.stringify({ ...initialIntervention, inspectionValid: undefined, inspectionRevision: undefined, fundingInspectionRevision: undefined, inspectionOwner: undefined, fundingApprover: undefined, fundingReviews: undefined })
    const port = storage([[legacyKey, raw]])
    expect(readInterventionCollection(port).interventions[0]?.ledger.inspectionOwner).toBe('road inspector')
    expect(port.values.get(legacyKey)).toBe(raw)
    expect(port.values.has(key)).toBe(false)
    expect(port.writes).toEqual([])
  })
  it('does not seed over an empty legacy source when the collection is absent', () => {
    const port = storage([[legacyKey, '']])
    expect(() => readInterventionCollection(port)).toThrow(StoredDataError)
    expect(port.values.get(legacyKey)).toBe('')
    expect(port.values.has(key)).toBe(false)
    expect(port.writes).toEqual([])
  })
  it('rejects malformed migration output and identifies the retained legacy source', () => {
    const raw = JSON.stringify({ ...initialIntervention, network: [null] }), port = storage([[legacyKey, raw]])
    try { readInterventionCollection(port); expect.fail('Malformed legacy output should fail validation.') }
    catch (error) { expect(error).toBeInstanceOf(StoredDataError); expect(error).toHaveProperty('key', legacyKey) }
    expect(port.values.get(legacyKey)).toBe(raw)
    expect(port.writes).toEqual([])
  })
  it('retains stale funding and unresolved graph dependencies as valid business states', () => {
    const adopted = adoptFunding(ready.ledger, 'finance authority')
    const stale = reinspect(invalidateInspection(adopted))
    const blocked = { ...first.ledger, network: first.ledger.network.map(node => node.id === asset.id ? { ...node, dependsOn: ['UNRESOLVED-SOURCE'] } : node) }
    const value = { ...seed, interventions: seed.interventions.map(record => record.id === ready.id ? { ...record, ledger: stale } : record.id === first.id ? { ...record, ledger: blocked } : record) }
    const port = storage()
    saveInterventionCollection(port, value)
    expect(readInterventionCollection(port)).toEqual(value)
  })
})
