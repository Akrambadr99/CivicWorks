import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets, downstreamOf, impactScore, interventionFindings } from './assetNetwork'
import type { Asset } from './assetNetwork'
export function AssetDependencyNetworkPage() {
  const { assetId } = useParams()
  const [network, setNetwork] = useState<readonly Asset[]>(assets)
  const [selectedId, setSelectedId] = useState(assetId ?? 'ROAD-142')
  const [asOf, setAsOf] = useState('2026-09-14')
  const [notice, setNotice] = useState('')
  const selected = network.find(item => item.id === selectedId)
  const findings = interventionFindings(selectedId, network, asOf)
  const downstream = downstreamOf(selectedId, network)
  function approvePermit() {
    setNetwork(current => current.map(item => item.id === selectedId ? { ...item, permit: 'approved' } : item))
    setNotice(`${selectedId} permit approval recorded; downstream findings recalculated.`)
  }
  return <div className="suite-page">
    <header className="suite-title"><div><small>ASSETS / SERVICE CONTINUITY</small>
      <h1>Infrastructure asset and dependency network</h1>
      <p>District North · Water main dependency · Review upstream and downstream consequences.</p>
    </div></header>
    <div className="domain-surface-layout">
      <section className="suite-card" aria-label="Asset network"><h2>Linked assets</h2>
        <ul>{network.map(asset => <li key={asset.id}>
          <button onClick={() => { setSelectedId(asset.id); }} aria-pressed={selectedId === asset.id}>
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
          <label>Effective date <input type="date" value={asOf} onChange={event => { setAsOf(event.target.value); }} /></label>
          <h3>Intervention findings</h3>
          {findings.length ? <ul>{findings.map(item => <li key={item}>{item}</li>)}</ul> : <p>Intervention prerequisites pass.</p>}
          {selected.permit === 'pending' && <button onClick={approvePermit}>Record permit approval</button>}
          <p role="status">{notice}</p>
        </>}
      </section>
    </div>
  </div>
}
