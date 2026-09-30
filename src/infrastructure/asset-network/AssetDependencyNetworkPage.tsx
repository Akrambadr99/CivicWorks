import { SelectedRecordRoute } from './SelectedRecordRoute'
import { useRecordContext } from '../../workspace/RecordScope'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { downstreamOf, impactScore, interventionFindings } from './assetNetwork'
import { changePermit, fundingBlockers, invalidateInspection, readIntervention, reinspect, saveIntervention } from './interventionLedger'
function RecordContent() {
  const { storage, guard } = useRecordContext()

  const { assetId } = useParams()
  const [ledger, setLedger] = useState(() => readIntervention(storage))
  const network = ledger.network
  const [selectedId, setSelectedId] = useState(assetId ?? 'ROAD-142')
  const [asOf, setAsOf] = useState('2026-09-14')
  const [notice, setNotice] = useState('')
  const selected = network.find(item => item.id === selectedId)
  const findings = interventionFindings(selectedId, network, asOf)
  const downstream = downstreamOf(selectedId, network)
  function approvePermit() {
    setLedger(saveIntervention(storage, changePermit(ledger, selectedId, 'approved')))
    setNotice(`${selectedId} permit approval recorded; downstream findings recalculated.`)
  }
  function revokePermit() {
    try { setLedger(saveIntervention(storage, changePermit(ledger, selectedId, 'pending'))); setNotice('Permit approval revoked.') }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Revocation failed.') }
  }
  function reviewInspection() {
    try { setLedger(saveIntervention(storage, ledger.inspectionValid ? invalidateInspection(ledger) : reinspect(ledger))); setNotice('Inspection revision recorded; funding eligibility recalculated.') }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Inspection review failed.') }
  }
  return <div className="suite-page">
    <header className="suite-title"><div><small>ASSETS / SERVICE CONTINUITY</small>
      <h1>Infrastructure asset and dependency network</h1>
      <p>District North · Water main dependency · Review upstream and downstream consequences.</p>
    </div></header>
    <div className="domain-surface-layout">
      <section className="suite-card" aria-label="Asset network"><h2>Linked assets</h2>
        <ul>{network.map(asset => <li key={asset.id}>
          <button onClick={guard(() => { setSelectedId(asset.id); })} aria-pressed={selectedId === asset.id}>
            {asset.id} · {asset.kind} · condition {asset.condition}
          </button></li>)}</ul>
      </section>
      <section className="suite-card" aria-label="Asset decision">
        <h2>{selected?.id ?? 'Asset unavailable'}</h2>
        {selected && <>
          <p>{selected.kind} · {selected.district} · permit {selected.permit}</p>
          <p>Direct dependencies: {selected.dependsOn.join(', ') || 'none'}</p>
          <p>Downstream assets: {downstream.map(item => item.id).join(', ') || 'none'}</p>
          <p>Service impact score: {impactScore(selected.id, network)}</p>
          <p>Intervention revision {ledger.revision} · Funding {ledger.fundingAdopted ? 'adopted' : 'pending'}</p>
          {selected.id === 'ROAD-142' && <p>Inspection revision {ledger.inspectionRevision} · {ledger.inspectionValid ? 'valid' : 'invalid'}</p>}
          {selected.id === 'ROAD-142' && fundingBlockers(ledger).map(item => <p role="alert" key={item}>{item}</p>)}
          <label>Effective date <input type="date" value={asOf} onChange={event => { setAsOf(event.target.value); }} /></label>
          <h3>Intervention findings</h3>
          {findings.length ? <ul>{findings.map(item => <li key={item}>{item}</li>)}</ul> : <p>Intervention prerequisites pass.</p>}
          {selected.permit === 'pending' && <button onClick={guard(approvePermit)}>Record permit approval</button>}
          {selected.id === 'ROAD-142' && selected.permit === 'approved' && <button onClick={guard(revokePermit)}>Revoke permit approval</button>}
          {selected.id === 'ROAD-142' && <button onClick={guard(reviewInspection)}>{ledger.inspectionValid ? 'Invalidate inspection evidence' : 'Record replacement inspection'}</button>}
          <p role="status">{notice}</p>
        </>}
      </section>
    </div>
  </div>
}

export function AssetDependencyNetworkPage() { return <SelectedRecordRoute><RecordContent /></SelectedRecordRoute> }
