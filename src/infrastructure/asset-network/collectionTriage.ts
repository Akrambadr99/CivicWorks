import type { ExplorerPolicy } from '../../workspace/collectionExplorer'
import type { InterventionRecord } from './interventionCollection'

// Evidence and permit blockers precede funding review; this is not an approval decision.
export const interventionTriage: ExplorerPolicy<InterventionRecord> = {
  searchText: record => [record.id, record.district, record.inspectionSourceId,
    ...(record.ledger.fundingReviews ?? []).filter(item => item.status === 'open').map(item => item.assigneeId ?? '')].join(' '),
  revision: record => record.ledger.revision,
  state: record => {
    const { ledger } = record
    if (!ledger.inspectionValid) return 'inspection'
    if (ledger.network.find(item => item.id === 'ROAD-142')?.permit !== 'approved') return 'permit'
    if (ledger.fundingAdopted && ledger.fundingInspectionRevision !== ledger.inspectionRevision) return 'funding-stale'
    if (ledger.fundingReviews?.some(item => item.status === 'stale')) return 'stale'
    if (ledger.fundingReviews?.some(item => item.status === 'open')) return 'review'
    return ledger.fundingAdopted ? 'adopted' : 'ready'
  },
  states: [
    { value: 'inspection', label: 'Inspection invalid' },
    { value: 'permit', label: 'Permit not approved' },
    { value: 'funding-stale', label: 'Funding needs revalidation' },
    { value: 'stale', label: 'Stale funding review' },
    { value: 'review', label: 'Funding review open' },
    { value: 'adopted', label: 'Funding adopted' },
    { value: 'ready', label: 'Ready to request funding' },
  ],
}
