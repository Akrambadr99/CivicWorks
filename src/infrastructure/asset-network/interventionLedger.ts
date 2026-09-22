import type { StoragePort } from '../../workspace/repository'
import { assets } from './assetNetwork'
import type { Asset } from './assetNetwork'

export interface InterventionLedger {
  network: readonly Asset[]
  fundingAdopted: boolean
  inspectionValid: boolean
  inspectionRevision: number
  fundingInspectionRevision: number | null
  inspectionOwner: string
  fundingApprover: string | null
  revision: number
  history: readonly { revision: number; action: string; assetId: string; actor?: string }[]
}
const key = 'civicworks:road-142:intervention:v1'
export const initialIntervention: InterventionLedger = { network: assets, fundingAdopted: false, inspectionValid: true, inspectionRevision: 0, fundingInspectionRevision: null, inspectionOwner: 'road inspector', fundingApprover: null, revision: 0, history: [] }
export function readIntervention(storage: StoragePort): InterventionLedger {
  const raw = storage.getItem(key)
  if (!raw) return initialIntervention
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('network' in value) || !Array.isArray(value.network) ||
    !('fundingAdopted' in value) || typeof value.fundingAdopted !== 'boolean' ||
    !('revision' in value) || typeof value.revision !== 'number' ||
    !('history' in value) || !Array.isArray(value.history)) throw new Error('Invalid intervention record.')
  const record = value as Omit<InterventionLedger, 'inspectionValid' | 'inspectionRevision' | 'fundingInspectionRevision' | 'inspectionOwner' | 'fundingApprover'> &
    Partial<Pick<InterventionLedger, 'inspectionValid' | 'inspectionRevision' | 'fundingInspectionRevision' | 'inspectionOwner' | 'fundingApprover'>>
  return { ...record, inspectionValid: record.inspectionValid ?? true,
    inspectionRevision: record.inspectionRevision ?? 0,
    fundingInspectionRevision: record.fundingInspectionRevision ?? (record.fundingAdopted ? 0 : null), inspectionOwner: record.inspectionOwner ?? 'road inspector', fundingApprover: record.fundingApprover ?? null }
}
export function fundingReviewPolicy(state: InterventionLedger, actor: string): { allowed: boolean; blockers: string[]; queue: 'inspection' | 'finance-review' | 'funded' } {
  const blockers = fundingBlockers(state).filter(item => !item.includes('stale after'))
  if (actor !== 'finance authority') blockers.push('Only finance may approve ROAD-142 funding.')
  if (actor === state.inspectionOwner) blockers.push('The inspector cannot independently approve funding.')
  return { allowed: blockers.length === 0, blockers, queue: !state.inspectionValid ? 'inspection' : state.fundingAdopted && state.fundingInspectionRevision === state.inspectionRevision ? 'funded' : 'finance-review' }
}
export function fundingBlockers(state: InterventionLedger): string[] {
  const road = state.network.find(item => item.id === 'ROAD-142')
  const blockers = road?.permit === 'approved' ? [] : ['ROAD-142 permit approval is required before funding adoption.']
  if (!state.inspectionValid) blockers.push('ROAD-142 inspection evidence is invalid and requires reinspection.')
  if (state.fundingAdopted && state.fundingInspectionRevision !== state.inspectionRevision) blockers.push('Adopted funding is stale after an inspection revision.')
  return blockers
}
export function changePermit(state: InterventionLedger, assetId: string, permit: Asset['permit']): InterventionLedger {
  if (!state.network.some(item => item.id === assetId)) throw new Error('Asset was not found.')
  if (permit !== 'approved' && state.fundingAdopted) throw new Error('Adopted funding depends on this permit approval.')
  const revision = state.revision + 1
  return { ...state, revision, network: state.network.map(item => item.id === assetId ? { ...item, permit } : item),
    history: [...state.history, { revision, action: 'permit-' + permit, assetId }] }
}
export function adoptFunding(state: InterventionLedger, actor: string): InterventionLedger {
  const policy = fundingReviewPolicy(state, actor)
  if (!policy.allowed) throw new Error(policy.blockers[0])
  if (state.fundingAdopted) throw new Error('Funding is already adopted.')
  const revision = state.revision + 1
  return { ...state, revision, fundingAdopted: true, fundingInspectionRevision: state.inspectionRevision, fundingApprover: actor,
    history: [...state.history, { revision, action: 'funding-adopted', assetId: 'ROAD-142', actor }] }
}
export function invalidateInspection(state: InterventionLedger): InterventionLedger {
  if (!state.inspectionValid) throw new Error('Inspection is already invalid.')
  const revision = state.revision + 1
  return { ...state, revision, inspectionRevision: state.inspectionRevision + 1, inspectionValid: false,
    history: [...state.history, { revision, action: 'inspection-invalidated', assetId: 'ROAD-142' }] }
}
export function reinspect(state: InterventionLedger): InterventionLedger {
  if (state.inspectionValid) throw new Error('No invalid inspection requires replacement.')
  const revision = state.revision + 1
  return { ...state, revision, inspectionRevision: state.inspectionRevision + 1, inspectionValid: true,
    history: [...state.history, { revision, action: 'inspection-replaced', assetId: 'ROAD-142' }] }
}
export function revalidateFunding(state: InterventionLedger, actor: string): InterventionLedger {
  if (!state.fundingAdopted || state.fundingInspectionRevision === state.inspectionRevision) throw new Error('No stale funding decision exists.')
  if (!state.inspectionValid) throw new Error('Current inspection evidence is required.')
  const policy = fundingReviewPolicy(state, actor)
  if (!policy.allowed) throw new Error(policy.blockers[0])
  const revision = state.revision + 1
  return { ...state, revision, fundingInspectionRevision: state.inspectionRevision,
    history: [...state.history, { revision, action: 'funding-revalidated', assetId: 'ROAD-142', actor }] }
}
export function saveIntervention(storage: StoragePort, state: InterventionLedger): InterventionLedger {
  storage.setItem(key, JSON.stringify(state))
  return state
}
