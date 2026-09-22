import { describe, expect, it } from 'vitest'
import { archiveIntervention, claimInterventionFunding, interventionById, interventionInbox, readInterventionCollection,
  requestFundingReviews, reviseInspection, saveInterventionCollection, seedInterventionCollection } from './interventionCollection'

function storage() { const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } } }
describe('persisted district intervention collection', () => {
  it('holds independent interventions and mixed finance and permit work', () => {
    const state = seedInterventionCollection()
    expect(state.interventions).toHaveLength(5)
    expect(interventionInbox(state).map(item => item.interventionId)).toContain('ROAD-143')
    expect(interventionInbox(state).find(item => item.interventionId === 'ROAD-142')?.kind).toBe('permit-blocked')
  })
  it('claims only the selected eligible district review and persists it', () => {
    const port = storage(); const state = seedInterventionCollection()
    const next = claimInterventionFunding(state, 'ROAD-143', 'finance-amira', interventionById(state, 'ROAD-143').ledger.revision)
    saveInterventionCollection(port, next)
    expect(interventionInbox(readInterventionCollection(port)).find(item => item.interventionId === 'ROAD-143')?.assigneeId).toBe('finance-amira')
    expect(interventionById(readInterventionCollection(port), 'ROAD-144')).toEqual(interventionById(state, 'ROAD-144'))
    expect(() => claimInterventionFunding(state, 'ROAD-310', 'finance-amira', interventionById(state, 'ROAD-310').ledger.revision)).toThrow('outside district scope')
  })
  it('propagates inspection invalidation only to linked interventions', () => {
    const state = seedInterventionCollection(); const result = reviseInspection(state, 'INS-N-4', 1)
    expect(result.updated).toEqual(['ROAD-142', 'ROAD-143', 'ROAD-144'])
    expect(interventionById(result.collection, 'ROAD-143').ledger.fundingReviews?.at(-1)?.status).toBe('stale')
    expect(interventionById(result.collection, 'ROAD-310').ledger.revision).toBe(interventionById(state, 'ROAD-310').ledger.revision)
    expect(() => reviseInspection(result.collection, 'INS-N-4', 1)).toThrow('revision changed')
  })
  it('reports selected funding outcomes and protects review references', () => {
    const state = seedInterventionCollection(); const result = requestFundingReviews(state, ['ROAD-142', 'ROAD-143', 'ROAD-144', 'ROAD-311', 'missing'])
    expect(result.updated).toEqual(['ROAD-144'])
    expect(result.skipped).toEqual(['ROAD-311'])
    expect(result.blocked.map(item => item.id)).toEqual(['ROAD-142', 'ROAD-143', 'missing'])
    expect(() => archiveIntervention(state, 'ROAD-143')).toThrow('funding review')
  })
})
