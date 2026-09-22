import type { StoragePort } from '../../workspace/repository'
import { assets } from './assetNetwork'
import type { Asset } from './assetNetwork'

export interface InterventionLedger {
  network: readonly Asset[]
  fundingAdopted: boolean
  inspectionValid: boolean
  inspectionRevision: number
  fundingInspectionRevision: number | null
  revision: number
  history: readonly { revision: number; action: string; assetId: string }[]
}
const key = 'civicworks:road-142:intervention:v1'
export const initialIntervention: InterventionLedger = { network: assets, fundingAdopted: false, inspectionValid: true, inspectionRevision: 0, fundingInspectionRevision: null, revision: 0, history: [] }
export function readIntervention(storage: StoragePort): InterventionLedger {
  const raw = storage.getItem(key)
  if (!raw) return initialIntervention
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('network' in value) || !Array.isArray(value.network) ||
    !('fundingAdopted' in value) || typeof value.fundingAdopted !== 'boolean' ||
    !('revision' in value) || typeof value.revision !== 'number' ||
    !('history' in value) || !Array.isArray(value.history)) throw new Error('Invalid intervention record.')
  const record = value as Omit<InterventionLedger, 'inspectionValid' | 'inspectionRevision' | 'fundingInspectionRevision'> &
    Partial<Pick<InterventionLedger, 'inspectionValid' | 'inspectionRevision' | 'fundingInspectionRevision'>>
  return { ...record, inspectionValid: record.inspectionValid ?? true,
    inspectionRevision: record.inspectionRevision ?? 0,
    fundingInspectionRevision: record.fundingInspectionRevision ?? (record.fundingAdopted ? 0 : null) }
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
export function adoptFunding(state: InterventionLedger): InterventionLedger {
  if (fundingBlockers(state).length) throw new Error(fundingBlockers(state)[0])
  if (state.fundingAdopted) throw new Error('Funding is already adopted.')
  const revision = state.revision + 1
  return { ...state, revision, fundingAdopted: true, fundingInspectionRevision: state.inspectionRevision,
    history: [...state.history, { revision, action: 'funding-adopted', assetId: 'ROAD-142' }] }
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
export function revalidateFunding(state: InterventionLedger): InterventionLedger {
  if (!state.fundingAdopted || state.fundingInspectionRevision === state.inspectionRevision) throw new Error('No stale funding decision exists.')
  if (!state.inspectionValid) throw new Error('Current inspection evidence is required.')
  const revision = state.revision + 1
  return { ...state, revision, fundingInspectionRevision: state.inspectionRevision,
    history: [...state.history, { revision, action: 'funding-revalidated', assetId: 'ROAD-142' }] }
}
export function saveIntervention(storage: StoragePort, state: InterventionLedger): InterventionLedger {
  storage.setItem(key, JSON.stringify(state))
  return state
}
