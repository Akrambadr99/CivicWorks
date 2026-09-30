import type { SnapshotAdapter } from '../../workspace/collectionSnapshot'
import { interventionCollectionRule } from './collectionValidation'
import { readInterventionCollection } from './interventionCollection'
import type { InterventionCollection } from './interventionCollection'

export const collectionSnapshotAdapter: SnapshotAdapter<InterventionCollection> = {
  product: 'CivicWorks', scope: 'intervention-collection', label: 'Interventions and inspection sources',
  read: readInterventionCollection, validate: interventionCollectionRule,
  groups: collection => [
    { key: 'interventions', label: 'Interventions', records: collection.interventions.map(record => ({
      id: record.id, label: `${record.id} · ${record.district}${record.archived ? ' · Archived' : ''}`, value: record,
    })) },
    { key: 'inspections', label: 'Inspection sources', records: collection.inspections.map(source => ({
      id: source.id, label: `${source.id} · Revision ${String(source.revision)}`, value: source,
    })) },
  ],
}
