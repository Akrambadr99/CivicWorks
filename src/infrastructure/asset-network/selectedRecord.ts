import type { StoragePort } from '../../platform/storage-port'
import { bindRecord } from '../../workspace/recordStorage'
import { readInterventionCollection, saveInterventionCollection } from './interventionCollection'
import { readIntervention } from './interventionLedger'

export function openSelectedRecord(storage: StoragePort, id = 'ROAD-142') {
  return bindRecord(storage, id, {
    key: 'civicworks:road-142:intervention:v1',
    collectionKey: 'civicworks:intervention-collection:v1',
    read: readInterventionCollection, save: saveInterventionCollection,
    find: (collection, target) => collection.interventions.find(item => item.id === target),
    value: record => record.ledger, archived: record => record.archived,
    replace: (collection, target, raw) => {
      const value = readIntervention({ getItem: () => raw })
      return { ...collection, interventions: collection.interventions.map(item => item.id === target ? { ...item, ledger: value } : item),
        audit: [...collection.audit, { action: 'detail-updated', id: target, related: [] }] }
    },
  })
}
