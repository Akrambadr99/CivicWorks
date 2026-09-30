import { describe, expect, it } from 'vitest'
import { interventionTriage } from './collectionTriage'
import { seedInterventionCollection } from './interventionCollection'
import { adoptFunding, invalidateInspection, reinspect } from './interventionLedger'

describe('district intervention triage', () => {
  it('distinguishes permit blockers, review work and ready records', () => {
    expect(seedInterventionCollection().interventions.map(interventionTriage.state)).toEqual(['permit', 'review', 'ready', 'review', 'permit'])
  })
  it('prioritizes invalid inspection evidence over a stale funding review', () => {
    const record = seedInterventionCollection().interventions[1]!
    expect(interventionTriage.state({ ...record, ledger: invalidateInspection(record.ledger) })).toBe('inspection')
  })
  it('searches district and linked source and uses the current ledger revision', () => {
    const record = seedInterventionCollection().interventions[1]!
    expect(interventionTriage.searchText(record)).toBe('ROAD-143 North INS-N-4 ')
    expect(interventionTriage.revision(record)).toBe(record.ledger.revision)
  })
  it('keeps adopted funding in revalidation after inspection replacement', () => {
    const record = seedInterventionCollection().interventions[1]!
    const adopted = adoptFunding(record.ledger, 'finance authority')
    expect(interventionTriage.state({ ...record, ledger: adopted })).toBe('adopted')
    const replaced = reinspect(invalidateInspection(adopted))
    expect(interventionTriage.state({ ...record, ledger: replaced })).toBe('funding-stale')
  })
})
