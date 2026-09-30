import { collectionBackPath } from '../../workspace/collectionExplorer'
import type { ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RecordScope } from '../../workspace/RecordScope'
import { openSelectedRecord } from './selectedRecord'

export function SelectedRecordRoute({ children }: { children: ReactNode }) {
  const [params] = useSearchParams()
  const route = useParams()
  const id = params.get('record') ?? route['assetId'] ?? 'ROAD-142'
  return <RecordScope id={id} back={collectionBackPath('/projects/intervention-workspace', 'intervention', id, params)}
    open={target => openSelectedRecord(window.localStorage, target)}>{children}</RecordScope>
}
