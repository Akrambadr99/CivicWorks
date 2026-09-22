import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { financeApprovers } from './financeWorkload'
import { archiveIntervention, claimInterventionFunding, interventionInbox, interventionRows, readInterventionCollection,
  requestFundingReviews, reviseInspection, saveInterventionCollection } from './interventionCollection'

export function InterventionCollectionPage() {
  const [collection, setCollection] = useState(() => readInterventionCollection(window.localStorage))
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('active')
  const [approver, setApprover] = useState('finance-amira'); const [checked, setChecked] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const selectedId = params.get('intervention') ?? 'ROAD-143'; const selected = collection.interventions.find(item => item.id === selectedId)
  function choose(id: string) { setParams(current => { const next = new URLSearchParams(current); next.set('intervention', id); return next }) }
  function persist(next: typeof collection, message: string) { setCollection(saveInterventionCollection(window.localStorage, next)); setNotice(message) }
  function run(action: () => typeof collection, success: string) {
    try { persist(action(), success) } catch (error) { setNotice(error instanceof Error ? error.message : 'Intervention operation failed.') }
  }
  return <main className="suite-page"><header className="suite-title"><div><small>INFRASTRUCTURE / FUNDING RESPONSIBILITY</small>
    <h1>District intervention workspace</h1><p>Independent road interventions connected to inspection evidence and finance review.</p></div></header>
    <section className="metrics" aria-label="Intervention summary">
      <article><small>Active interventions</small><strong>{collection.interventions.filter(item => !item.archived).length}</strong></article>
      <article><small>Funding work</small><strong>{interventionInbox(collection).length}</strong></article>
      <article><small>Inspection sources</small><strong>{collection.inspections.length}</strong></article>
    </section>
    <section className="suite-card" aria-label="Finance queue"><h2>Finance and permit queue</h2>
      {interventionInbox(collection).length ? <ul>{interventionInbox(collection).map(item => <li key={item.interventionId + item.id}>
        <button onClick={() => { choose(item.interventionId) }}>{item.interventionId}</button> · {item.district} · {item.kind} ·
        {item.assigneeId ?? 'team queue'} · {item.status}</li>)}</ul> : <p>No finance work.</p>}
      <label>Finance approver <select value={approver} onChange={event => { setApprover(event.target.value) }}>
        {financeApprovers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </section>
    <section className="suite-card" aria-label="Intervention collection"><h2>Road interventions</h2>
      <label>Search roads or district <input value={query} onChange={event => { setQuery(event.target.value) }} /></label>
      <label>Show <select value={filter} onChange={event => { setFilter(event.target.value) }}><option value="active">Active</option>
        <option value="archived">Archived</option><option value="all">All</option></select></label>
      {interventionRows(collection, query, filter).length ? <ul>{interventionRows(collection, query, filter).map(record => <li key={record.id}>
        <label><input type="checkbox" checked={checked.includes(record.id)} onChange={event => {
          setChecked(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))
        }} /> Select {record.id}</label>
        <button aria-current={selectedId === record.id ? 'true' : undefined} onClick={() => { choose(record.id) }}>
          {record.id} · {record.district}</button> · ledger r{record.ledger.revision} · {record.inspectionSourceId}
        {record.archived ? ' · archived' : ''}</li>)}</ul> : <p>No interventions match this view.</p>}
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
    <p role="status">{notice}</p>
  </main>
}
