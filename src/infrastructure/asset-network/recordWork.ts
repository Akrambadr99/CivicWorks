import type { StoragePort } from '../../workspace/repository'
import { readInterventionCollection } from './interventionCollection'

export function activeRecordWork(storage: StoragePort) {
  return readInterventionCollection(storage).interventions.filter(item => !item.archived).map(item => ({ interventionId: item.id, district: item.district, ledger: item.ledger }))
}
export function selectedRecordWork(storage: StoragePort, id: string) {
  const record = activeRecordWork(storage).find(item => item.interventionId === id)
  if (!record) throw new Error('Active record not found.')
  return record
}
