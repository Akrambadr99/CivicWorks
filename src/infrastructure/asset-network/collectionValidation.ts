import { array, booleanValue, finiteNumber, nonEmptyText, nonNegativeInteger, nullable, object, oneOf, optional, refine, text, uniqueBy } from '../../workspace/storageValidation'
import type { InspectionSource, InterventionCollection, InterventionRecord } from './interventionCollection'
import type { FundingReview, InterventionLedger } from './interventionLedger'
import type { Asset } from './assetNetwork'

const calendarDate = refine(text, value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'expected a calendar date')
const asset = object<Asset>({
  id: nonEmptyText, kind: oneOf('road', 'water-main', 'signal', 'hospital-access'), district: text,
  dependsOn: array(nonEmptyText), criticality: finiteNumber, condition: finiteNumber, inspectionDue: calendarDate,
  permit: oneOf('approved', 'pending', 'not-required'),
})
const review = object<FundingReview>({
  id: nonEmptyText, assetId: nonEmptyText, inspectionRevision: nonNegativeInteger, permitRevision: nonNegativeInteger,
  requestedBy: text, assignee: text, assigneeId: optional(nullable(nonEmptyText)), status: oneOf('open', 'stale', 'completed', 'superseded'),
  supersedesId: optional(nonEmptyText), decision: optional(oneOf('adopted', 'changes_requested')), reason: optional(text),
})
const ledger = object<InterventionLedger>({
  network: uniqueBy(array(asset), 'id'), fundingAdopted: booleanValue, inspectionValid: booleanValue, inspectionRevision: nonNegativeInteger,
  fundingInspectionRevision: nullable(nonNegativeInteger), inspectionOwner: text, fundingApprover: nullable(text),
  fundingReviews: optional(uniqueBy(array(review), 'id')), revision: nonNegativeInteger,
  history: array(object<InterventionLedger['history'][number]>({ revision: nonNegativeInteger, action: text, assetId: nonEmptyText, actor: optional(text) })),
})
const intervention = object<InterventionRecord>({ id: nonEmptyText, district: nonEmptyText, inspectionSourceId: nonEmptyText, ledger, archived: booleanValue })
const inspection = object<InspectionSource>({ id: nonEmptyText, revision: nonNegativeInteger, valid: booleanValue, interventionIds: array(nonEmptyText) })
export const interventionCollectionRule = object<InterventionCollection>({
  interventions: uniqueBy(array(intervention), 'id'), inspections: uniqueBy(array(inspection), 'id'),
  audit: array(object<InterventionCollection['audit'][number]>({ action: text, id: nonEmptyText, related: array(nonEmptyText) })),
})
