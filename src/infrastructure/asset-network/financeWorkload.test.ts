import { describe, expect, it } from 'vitest'
import { adoptFunding, changePermit, initialIntervention, invalidateInspection, requestFundingReview } from './interventionLedger'
import { claimFundingReview, financeEligibility, financeWorkInbox, financeWorkload, rankFinanceApprovers, transferFundingClaim } from './financeWorkload'

function pending() {
  return requestFundingReview(changePermit(initialIntervention, 'ROAD-142', 'approved'), 'road inspector')
}

describe('regional finance work coordination', () => {
  it('ranks eligible named reviewers and enforces cross-intervention capacity', () => {
    const first = pending()
    const second = pending()
    const records = [
      { interventionId: 'N-142', district: 'North', ledger: first },
      { interventionId: 'N-143', district: 'North', ledger: second },
    ]
    expect(rankFinanceApprovers(records, 'North', 'road inspector').map(item => item.id)).toEqual(['finance-amira', 'finance-eli'])
    const claimed = claimFundingReview(records[0]!, 'finance-eli', records, first.revision)
    const current = [{ ...records[0]!, ledger: claimed }, records[1]!]
    expect(financeWorkload(current, 'finance-eli')).toBe(1)
    expect(financeEligibility(current, 'North', 'finance-eli', 'road inspector')).toContain('Finance approver is at capacity.')
    expect(() => claimFundingReview(current[1]!, 'finance-eli', current, second.revision)).toThrow(/at capacity/)
    expect(financeWorkInbox(current, 'finance-eli')[0]?.interventionId).toBe('N-142')
    expect(() => adoptFunding(claimed, 'finance authority', 'finance-amira')).toThrow(/another named/)
    expect(adoptFunding(claimed, 'finance authority', 'finance-eli').fundingAdopted).toBe(true)
  })

  it('requires reasoned director transfer and makes inspection-stale work nonactionable', () => {
    const state = pending()
    const record = { interventionId: 'N-142', district: 'North', ledger: state }
    const claimed = claimFundingReview(record, 'finance-amira', [record], state.revision)
    expect(() => transferFundingClaim({ ...record, ledger: claimed }, 'road inspector', 'finance-eli',
      'Need independent regional coverage.', [])).toThrow(/director/)
    const transferred = transferFundingClaim({ ...record, ledger: claimed }, 'program director', 'finance-eli',
      'Regional finance handoff due to workload.', [])
    expect(transferred.fundingReviews?.[0]?.assigneeId).toBe('finance-eli')
    const stale = invalidateInspection(transferred)
    expect(financeWorkInbox([{ ...record, ledger: stale }]).some(item => item.actionable)).toBe(false)
  })
})
