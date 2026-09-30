import { useCollectionExplorer } from '../../workspace/useCollectionExplorer'
import { ExplorerControls, ExplorerPagination, ExplorerSelection } from '../../workspace/CollectionExplorerControls'
import { withCollectionView } from '../../workspace/collectionExplorer'
import { interventionTriage } from './collectionTriage'
import { recordDetailPath, recordDecisionPath } from './recordLinks'
import { Link } from 'react-router-dom'
import { saveCurrentCollection } from '../../workspace/recordStorage'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { financeApprovers } from './financeWorkload'
import { archiveIntervention, claimInterventionFunding, interventionInbox, readInterventionCollection,
  requestFundingReviews, reviseInspection, saveInterventionCollection } from './interventionCollection'

export function InterventionCollectionPage() {
  const [collection, setCollection] = useState(() => readInterventionCollection(window.localStorage))
  const [params, setParams] = useSearchParams()
  const explorer = useCollectionExplorer(collection.interventions, interventionTriage)
  const [approver, setApprover] = useState('finance-amira'); const [checked, setChecked] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const selectedId = params.get('intervention') ?? 'ROAD-143'; const selected = collection.interventions.find(item => item.id === selectedId)
  function choose(id: string) { setParams(current => { const next = new URLSearchParams(current); next.set('intervention', id); return next }) }
  function persist(next: typeof collection, message: string) { try { setCollection(saveCurrentCollection(window.localStorage, collection, next, readInterventionCollection, saveInterventionCollection)); setNotice(message); return true } catch (error) { setNotice(error instanceof Error ? error.message : 'Save failed. Your input is preserved.'); return false } }
  function run(action: () => typeof collection, success: string) {
    try { return persist(action(), success) } catch (error) { setNotice(error instanceof Error ? error.message : 'Intervention operation failed.'); return false }
  }
  return <main className="suite-page"><header className="suite-title"><div><small>INFRASTRUCTURE / FUNDING RESPONSIBILITY</small>
    <h1>District intervention workspace</h1><p>Independent road interventions connected to inspection evidence and finance review.</p></div></header>
    <section className="metrics" aria-label="Intervention summary">
      <article><small>Active interventions</small><strong>{collection.interventions.filter(item => !item.archived).length}</strong></article>
      <article><small>Funding work</small><strong>{interventionInbox(collection).length}</strong></article>
      <article><small>Inspection sources</small><strong>{collection.inspections.length}</strong></article>
    </section>
    <section className="suite-card" aria-label="Finance queue"><h2>Finance and permit queue</h2>
      <p>All active finance and permit work. Collection filters below do not limit this queue.</p>
      {interventionInbox(collection).length ? <ul>{interventionInbox(collection).map(item => <li key={item.interventionId + item.id}>
        <button onClick={() => { choose(item.interventionId) }}>{item.interventionId}</button> · {item.district} · {item.kind} ·
        {item.assigneeId ?? 'team queue'} · {item.status}</li>)}</ul> : <p>No finance work.</p>}
      <label>Finance approver <select value={approver} onChange={event => { setApprover(event.target.value) }}>
        {financeApprovers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </section>
    <section className="suite-card" aria-label="Intervention collection"><h2>Road interventions</h2>
      <ExplorerControls noun="roads or district" view={explorer.view} onChange={explorer.setView} states={interventionTriage.states} onReset={explorer.reset} />
      <ExplorerSelection selected={checked} visible={explorer.rows.map(record => record.id)} onChange={setChecked} />
      {explorer.rows.length ? <ul>{explorer.rows.map(record => <li key={record.id}>
        <label><input type="checkbox" checked={checked.includes(record.id)} onChange={event => {
          setChecked(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))
        }} /> Select {record.id}</label>
        <button aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => { choose(record.id) }}>
          {record.id} · {record.district}</button> · ledger r{record.ledger.revision} · {record.inspectionSourceId}
        {record.archived ? ' · archived' : ''} · {interventionTriage.states.find(state => state.value === interventionTriage.state(record))?.label}</li>)}</ul> : <div className="collection-empty"><p>No interventions match this view. Adjust the filters or reset the view; your selected record is preserved.</p><button onClick={explorer.reset}>Reset empty view</button></div>}
      <ExplorerPagination page={explorer.page} pageCount={explorer.pageCount} matchingCount={explorer.matchingCount} onPageChange={page => { explorer.setView({ page }) }} />
      {selected && !explorer.rows.some(record => record.id === selected.id) && <p className="collection-context">Selected {selected.id} is outside the current page or filters. Its details remain open.</p>}
      <button disabled={!checked.length} onClick={() => { const result = requestFundingReviews(collection, checked)
        persist(result.collection, `${String(result.updated.length)} requested; ${String(result.skipped.length)} skipped; ${String(result.blocked.length)} blocked.`)
      }}>Request selected funding reviews</button>
    </section>
    <section className="suite-card" aria-label="Selected intervention"><h2>{selected?.id ?? 'Select an intervention'}</h2>{selected && <>
      <p>{selected.district} · ledger r{selected.ledger.revision} · inspection {selected.ledger.inspectionValid ? 'valid' : 'invalid'} r{selected.ledger.inspectionRevision}</p>
      <p>Funding {selected.ledger.fundingAdopted ? 'adopted' : 'pending'} · reviewer {selected.ledger.fundingReviews?.find(item => item.status === 'open')?.assigneeId ?? 'unclaimed'}</p>
      <button onClick={() => { run(() => claimInterventionFunding(collection, selected.id, approver, selected.ledger.revision), 'Funding review claimed.') }}>Claim selected funding review</button>
      <button onClick={() => { const source = collection.inspections.find(item => item.id === selected.inspectionSourceId)
        if (!source) return
        try { const result = reviseInspection(collection, source.id, source.revision)
          persist(result.collection, `${String(result.updated.length)} related interventions updated; ${String(result.blocked.length)} blocked.`)
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Inspection update failed.') }
      }}>Revise linked inspection evidence</button>
      <button onClick={() => { run(() => archiveIntervention(collection, selected.id), 'Intervention archived.') }}>Archive intervention</button>
      <details><summary>Intervention history</summary><ol>{selected.ledger.history.map(item =>
        <li key={item.revision}>{item.action} · r{item.revision} · {item.assetId}</li>)}</ol></details>
    </>}</section>
    <section className="suite-card" aria-label="Intervention audit"><h2>Collection audit</h2><ol>{collection.audit.toReversed().slice(0, 8).map((item, index) =>
      <li key={index}>{item.action} · {item.id} · {item.related.join(', ') || 'none'}</li>)}</ol></section>
    <nav aria-label="Selected record workflows">{selected && !selected.archived && <><Link to={withCollectionView(recordDetailPath(selected), params)}>Open record details</Link>{' · '}<Link to={withCollectionView(recordDecisionPath(selected), params)}>Open decision workflow</Link></>} <button onClick={() => { try { setCollection(readInterventionCollection(window.localStorage)); setNotice('Workspace refreshed; selection preserved.') } catch (error) { setNotice(error instanceof Error ? error.message : 'Refresh failed.') } }}>Refresh workspace</button></nav>
    <p role="status">{notice}</p>
  </main>
}
