import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../../data/memory-storage'
import { adoptFunding, changePermit, fundingBlockers, fundingReviewPolicy, invalidateInspection, readIntervention, reinspect, revalidateFunding, saveIntervention } from './interventionLedger'
describe('permit to funding dependency', () => {
  it('persists permit approval and changes budget eligibility', () => {
    const storage = new MemoryStorage()
    expect(fundingBlockers(readIntervention(storage))).toHaveLength(1)
    saveIntervention(storage, changePermit(readIntervention(storage), 'ROAD-142', 'approved'))
    expect(fundingBlockers(readIntervention(storage))).toEqual([])
  })
  it('blocks permit revocation after funding adoption', () => {
    const approved = changePermit(readIntervention(new MemoryStorage()), 'ROAD-142', 'approved')
    expect(fundingReviewPolicy(approved, 'road inspector')).toMatchObject({ allowed: false, queue: 'finance-review' })
    const adopted = adoptFunding(approved, 'finance authority')
    expect(() => changePermit(adopted, 'ROAD-142', 'pending')).toThrow(/depends/)
    expect(adopted.history.map(item => item.action)).toEqual(['permit-approved', 'funding-adopted'])
  })
  it('keeps adopted funding visible but stale after inspection invalidation until replacement review', () => {
    const approved = changePermit(readIntervention(new MemoryStorage()), 'ROAD-142', 'approved')
    const funded = adoptFunding(approved, 'finance authority')
    const invalid = invalidateInspection(funded)
    expect(fundingBlockers(invalid).join(' ')).toMatch(/invalid.*stale/)
    expect(() => revalidateFunding(invalid, 'finance authority')).toThrow(/Current inspection/)
    const replacement = reinspect(invalid)
    expect(fundingBlockers(replacement)).toEqual(['Adopted funding is stale after an inspection revision.'])
    expect(fundingBlockers(revalidateFunding(replacement, 'finance authority'))).toEqual([])
  })
})
