import type { InterventionLedger } from './interventionLedger'

export interface FinanceApprover {
  id: string
  name: string
  districts: readonly string[]
  maxReviews: number
  available: boolean
}
export interface AssetWorkRecord { interventionId: string; district: string; ledger: InterventionLedger }
export interface FinanceWorkItem {
  id: string
  interventionId: string
  district: string
  kind: 'funding-review' | 'inspection-blocked' | 'permit-blocked'
  status: 'open' | 'stale' | 'blocked'
  assigneeId: string | null
  sourceRevision: number
  actionable: boolean
}

export const financeApprovers: readonly FinanceApprover[] = [
  { id: 'finance-amira', name: 'Amira Hassan', districts: ['North', 'Central'], maxReviews: 2, available: true },
  { id: 'finance-eli', name: 'Eli Morgan', districts: ['North'], maxReviews: 1, available: true },
  { id: 'finance-rafa', name: 'Rafa Costa', districts: ['South'], maxReviews: 2, available: false },
]

export function financeWorkInbox(records: readonly AssetWorkRecord[], actorId?: string): FinanceWorkItem[] {
  return records.flatMap(({ interventionId, district, ledger }) => {
    const reviewItems: FinanceWorkItem[] = (ledger.fundingReviews ?? []).filter(item =>
      item.status === 'open' || item.status === 'stale').map(item => ({
      id: item.id, interventionId, district, kind: 'funding-review', status: item.status as 'open' | 'stale',
      assigneeId: item.assigneeId ?? null, sourceRevision: item.permitRevision,
      actionable: item.status === 'open' && item.permitRevision === ledger.revision && ledger.inspectionValid,
    }))
    const blocked: FinanceWorkItem[] = !ledger.inspectionValid ? [{
      id: interventionId + '-inspection', interventionId, district, kind: 'inspection-blocked',
      status: 'blocked', assigneeId: null, sourceRevision: ledger.inspectionRevision, actionable: false,
    }] : ledger.network.find(item => item.id === 'ROAD-142')?.permit !== 'approved' ? [{
      id: interventionId + '-permit', interventionId, district, kind: 'permit-blocked',
      status: 'blocked', assigneeId: null, sourceRevision: ledger.revision, actionable: false,
    }] : []
    return [...reviewItems, ...blocked]
  }).filter(item => actorId === undefined || item.assigneeId === actorId)
    .sort((a, b) => Number(b.actionable) - Number(a.actionable) ||
      Number(a.status === 'stale') - Number(b.status === 'stale') ||
      a.sourceRevision - b.sourceRevision || a.interventionId.localeCompare(b.interventionId) || a.id.localeCompare(b.id))
}

export function financeWorkload(records: readonly AssetWorkRecord[], actorId: string): number {
  return financeWorkInbox(records, actorId).filter(item => item.actionable).length
}

export function financeEligibility(records: readonly AssetWorkRecord[], district: string, actorId: string,
  inspectionOwner: string): string[] {
  const actor = financeApprovers.find(item => item.id === actorId)
  const blockers: string[] = []
  if (!actor?.available) blockers.push('Finance approver is unavailable.')
  if (actor && !actor.districts.includes(district)) blockers.push('Finance approver is outside district scope.')
  if (actor && financeWorkload(records, actorId) >= actor.maxReviews) blockers.push('Finance approver is at capacity.')
  if (actorId === inspectionOwner) blockers.push('Inspector cannot independently approve funding.')
  return blockers
}

export function rankFinanceApprovers(records: readonly AssetWorkRecord[], district: string, inspectionOwner: string): FinanceApprover[] {
  return financeApprovers.filter(actor => financeEligibility(records, district, actor.id, inspectionOwner).length === 0)
    .toSorted((a, b) => financeWorkload(records, a.id) - financeWorkload(records, b.id) || a.id.localeCompare(b.id))
}

export function claimFundingReview(record: AssetWorkRecord, actorId: string, records: readonly AssetWorkRecord[],
  expectedRevision: number): InterventionLedger {
  const state = record.ledger
  if (state.revision !== expectedRevision) throw new Error('Intervention revision changed before claim.')
  const review = (state.fundingReviews ?? []).find(item => item.status === 'open')
  if (review?.permitRevision !== state.revision || review.inspectionRevision !== state.inspectionRevision ||
    !state.inspectionValid) throw new Error('Only current inspection-backed funding review may be claimed.')
  if (review.assigneeId) throw new Error('Funding review is already claimed.')
  const blockers = financeEligibility(records, record.district, actorId, state.inspectionOwner)
  if (blockers.length) throw new Error(blockers[0])
  const revision = state.revision + 1
  return { ...state, revision, fundingReviews: state.fundingReviews?.map(item => item.id === review.id ?
    { ...item, assigneeId: actorId, permitRevision: revision } : item),
    history: [...state.history, { revision, action: 'funding-review-claimed', assetId: review.assetId, actor: actorId }] }
}

export function transferFundingClaim(record: AssetWorkRecord, supervisor: string, nextActorId: string,
  reason: string, records: readonly AssetWorkRecord[]): InterventionLedger {
  if (supervisor !== 'program director' || reason.trim().length < 12) throw new Error('Program director and handoff reason are required.')
  const state = record.ledger
  const review = (state.fundingReviews ?? []).find(item => item.status === 'open' && item.assigneeId)
  if (review?.permitRevision !== state.revision) throw new Error('Only a current claimed review may be transferred.')
  if (review.assigneeId === nextActorId) throw new Error('Review already belongs to this approver.')
  const blockers = financeEligibility(records, record.district, nextActorId, state.inspectionOwner)
  if (blockers.length) throw new Error(blockers[0])
  const revision = state.revision + 1
  return { ...state, revision, fundingReviews: state.fundingReviews?.map(item => item.id === review.id ?
    { ...item, assigneeId: nextActorId, permitRevision: revision } : item),
    history: [...state.history, { revision, action: 'funding-claim-transferred', assetId: review.assetId, actor: supervisor }] }
}
