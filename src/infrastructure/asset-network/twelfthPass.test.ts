import { describe, expect, it } from 'vitest'
import { adoptFunding, changePermit, financeInbox, initialIntervention, invalidateInspection, reinspect, requestFundingReview } from './interventionLedger'

describe('inspection-to-finance handoff', () => {
  it('requires a replacement after inspection revision before adopting funding', () => {
    let state = changePermit(initialIntervention, 'ROAD-142', 'approved')
    state = requestFundingReview(state, 'road inspector')
    expect(financeInbox(state, 'finance authority')).toHaveLength(1)
    state = reinspect(invalidateInspection(state))
    expect(financeInbox(state, 'finance authority')).toHaveLength(0)
    expect(() => adoptFunding(state, 'finance authority')).toThrow(/current ROAD-142/)
    state = requestFundingReview(state, 'road inspector')
    expect(state.fundingReviews?.map(item => item.status)).toEqual(['superseded', 'open'])
    expect(adoptFunding(state, 'finance authority').fundingReviews?.at(-1)?.status).toBe('completed')
  })
})
