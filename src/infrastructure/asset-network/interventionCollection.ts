import { readStored, writeStored } from '../../workspace/storageValidation'
import { interventionCollectionRule } from './collectionValidation'
import type { StoragePort, StorageReader } from '../../platform/storage-port'
import { changePermit, initialIntervention, invalidateInspection, readIntervention, reinspect, requestFundingReview } from './interventionLedger'
import type { InterventionLedger } from './interventionLedger'
import { claimFundingReview, financeWorkInbox } from './financeWorkload'
import type { AssetWorkRecord } from './financeWorkload'

export interface InterventionRecord { id: string; district: string; inspectionSourceId: string; ledger: InterventionLedger; archived: boolean }
export interface InspectionSource { id: string; revision: number; valid: boolean; interventionIds: readonly string[] }
export interface InterventionCollection { interventions: readonly InterventionRecord[]; inspections: readonly InspectionSource[]; audit: readonly { action: string; id: string; related: readonly string[] }[] }
export interface InterventionBatch { collection: InterventionCollection; updated: string[]; skipped: string[]; blocked: { id: string; reason: string }[] }
const key = 'civicworks:intervention-collection:v1'
function permitReady(): InterventionLedger { return changePermit(initialIntervention, 'ROAD-142', 'approved') }
function reviewReady(): InterventionLedger { return requestFundingReview(permitReady(), 'road inspector') }
export function seedInterventionCollection(legacy: InterventionLedger = initialIntervention): InterventionCollection {
  return { interventions: [
    { id: 'ROAD-142', district: 'North', inspectionSourceId: 'INS-N-4', ledger: legacy, archived: false },
    { id: 'ROAD-143', district: 'North', inspectionSourceId: 'INS-N-4', ledger: reviewReady(), archived: false },
    { id: 'ROAD-144', district: 'North', inspectionSourceId: 'INS-N-4', ledger: permitReady(), archived: false },
    { id: 'ROAD-310', district: 'South', inspectionSourceId: 'INS-S-2', ledger: reviewReady(), archived: false },
    { id: 'ROAD-311', district: 'South', inspectionSourceId: 'INS-S-2', ledger: initialIntervention, archived: true },
  ], inspections: [
    { id: 'INS-N-4', revision: 1, valid: true, interventionIds: ['ROAD-142', 'ROAD-143', 'ROAD-144'] },
    { id: 'INS-S-2', revision: 1, valid: true, interventionIds: ['ROAD-310', 'ROAD-311'] },
  ], audit: [] }
}
export function readInterventionCollection(storage: StorageReader): InterventionCollection {
  return readStored(storage, key, interventionCollectionRule, () => seedInterventionCollection(readIntervention(storage)), 'civicworks:road-142:intervention:v1')
}
export function saveInterventionCollection(storage: StoragePort, value: InterventionCollection): InterventionCollection {
  return writeStored(storage, key, interventionCollectionRule, value)
}
export function interventionById(value: InterventionCollection, id: string): InterventionRecord {
  const record = value.interventions.find(item => item.id === id)
  if (!record) throw new Error(`Intervention ${id} was not found.`)
  return record
}
export function interventionRows(value: InterventionCollection, query = '', filter = 'active'): InterventionRecord[] {
  const needle = query.trim().toLowerCase()
  return value.interventions.filter(item => (filter === 'all' || (filter === 'archived') === item.archived) &&
    (!needle || `${item.id} ${item.district} ${item.inspectionSourceId}`.toLowerCase().includes(needle))).toSorted((a, b) => a.id.localeCompare(b.id))
}
export function interventionInbox(value: InterventionCollection) {
  return financeWorkInbox(value.interventions.filter(item => !item.archived).map(item => ({
    interventionId: item.id, district: item.district, ledger: item.ledger,
  })))
}
export function claimInterventionFunding(value: InterventionCollection, id: string, actorId: string, expectedRevision: number): InterventionCollection {
  const record = interventionById(value, id)
  if (record.archived) throw new Error('Archived intervention cannot receive funding claim.')
  const records: AssetWorkRecord[] = value.interventions.filter(item => !item.archived).map(item => ({
    interventionId: item.id, district: item.district, ledger: item.ledger,
  }))
  const ledger = claimFundingReview({ interventionId: id, district: record.district, ledger: record.ledger }, actorId, records, expectedRevision)
  return { ...value, interventions: value.interventions.map(item => item.id === id ? { ...item, ledger } : item),
    audit: [...value.audit, { action: 'funding-claimed', id, related: [actorId] }] }
}
export function reviseInspection(value: InterventionCollection, id: string, expectedRevision: number): InterventionBatch {
  const source = value.inspections.find(item => item.id === id)
  if (source?.revision !== expectedRevision) throw new Error('Inspection source revision changed.')
  const updated: string[] = []; const skipped: string[] = []; const blocked: InterventionBatch['blocked'] = []
  const interventions = value.interventions.map(item => {
    if (!source.interventionIds.includes(item.id) || item.archived) { skipped.push(item.id); return item }
    try { const ledger = source.valid ? invalidateInspection(item.ledger) : reinspect(item.ledger)
      updated.push(item.id); return { ...item, ledger } }
    catch (error) { blocked.push({ id: item.id, reason: error instanceof Error ? error.message : 'Inspection change blocked.' }); return item }
  })
  return { collection: { ...value, interventions, inspections: value.inspections.map(item => item.id === id ?
    { ...item, revision: item.revision + 1, valid: !item.valid } : item),
    audit: [...value.audit, { action: 'inspection-revised', id, related: updated }] }, updated, skipped, blocked }
}
export function requestFundingReviews(value: InterventionCollection, ids: readonly string[]): InterventionBatch {
  const updated: string[] = []; const skipped: string[] = []; const blocked: InterventionBatch['blocked'] = []
  const unique = new Set(ids)
  const interventions = value.interventions.map(item => {
    if (!unique.has(item.id)) return item
    if (item.archived || item.ledger.fundingAdopted) { skipped.push(item.id); return item }
    try { const ledger = requestFundingReview(item.ledger, 'road inspector'); updated.push(item.id); return { ...item, ledger } }
    catch (error) { blocked.push({ id: item.id, reason: error instanceof Error ? error.message : 'Funding request blocked.' }); return item }
  })
  for (const id of unique) if (!value.interventions.some(item => item.id === id)) blocked.push({ id, reason: 'Intervention not found.' })
  return { collection: { ...value, interventions, audit: [...value.audit, { action: 'funding-reviews-requested', id: 'selection', related: updated }] }, updated, skipped, blocked }
}
export function archiveIntervention(value: InterventionCollection, id: string): InterventionCollection {
  const record = interventionById(value, id)
  if (record.archived || record.ledger.fundingReviews?.some(item => item.status === 'open') || record.ledger.fundingAdopted)
    throw new Error('Resolve funding review or adopted funding before archiving intervention.')
  return { ...value, interventions: value.interventions.map(item => item.id === id ? { ...item, archived: true } : item),
    audit: [...value.audit, { action: 'intervention-archived', id, related: [record.inspectionSourceId] }] }
}
