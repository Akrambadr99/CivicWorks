import type { StorageReader } from '../../platform/storage-port'
import { readInterventionCollection } from './interventionCollection'

export function activeRecordWork(storage: StorageReader) {
  return readInterventionCollection(storage).interventions.filter(item => !item.archived).map(item => ({ interventionId: item.id, district: item.district, ledger: item.ledger }))
}
export function selectedRecordWork(storage: StorageReader, id: string) {
  const record = activeRecordWork(storage).find(item => item.interventionId === id)
  if (!record) throw new Error('Active record not found.')
  return record
}
