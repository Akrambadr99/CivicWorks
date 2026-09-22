import type { StoragePort } from '../../workspace/repository'
import { assets } from './assetNetwork'
import type { Asset } from './assetNetwork'

export interface InterventionLedger {
  network: readonly Asset[]
  fundingAdopted: boolean
  revision: number
  history: readonly { revision: number; action: string; assetId: string }[]
}
const key = 'civicworks:road-142:intervention:v1'
export const initialIntervention: InterventionLedger = { network: assets, fundingAdopted: false, revision: 0, history: [] }
export function readIntervention(storage: StoragePort): InterventionLedger {
  const raw = storage.getItem(key)
  if (!raw) return initialIntervention
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || !('network' in value) || !Array.isArray(value.network) ||
    !('fundingAdopted' in value) || typeof value.fundingAdopted !== 'boolean' ||
    !('revision' in value) || typeof value.revision !== 'number' ||
    !('history' in value) || !Array.isArray(value.history)) throw new Error('Invalid intervention record.')
  return value as InterventionLedger
}
export function fundingBlockers(state: InterventionLedger): string[] {
  const road = state.network.find(item => item.id === 'ROAD-142')
  return road?.permit === 'approved' ? [] : ['ROAD-142 permit approval is required before funding adoption.']
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
  return { ...state, revision, fundingAdopted: true,
    history: [...state.history, { revision, action: 'funding-adopted', assetId: 'ROAD-142' }] }
}
export function saveIntervention(storage: StoragePort, state: InterventionLedger): InterventionLedger {
  storage.setItem(key, JSON.stringify(state))
  return state
}
