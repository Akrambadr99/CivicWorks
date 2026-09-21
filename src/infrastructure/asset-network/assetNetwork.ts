export type AssetKind = 'road' | 'water-main' | 'signal' | 'hospital-access'
export interface Asset { id: string; kind: AssetKind; district: string; dependsOn: readonly string[]; criticality: number; condition: number; inspectionDue: string; permit: 'approved' | 'pending' | 'not-required' }
export const assets: readonly Asset[] = [
  { id: 'WATER-19', kind: 'water-main', district: 'District North', dependsOn: [], criticality: 3, condition: 42, inspectionDue: '2026-09-10', permit: 'approved' },
  { id: 'ROAD-142', kind: 'road', district: 'District North', dependsOn: ['WATER-19'], criticality: 2, condition: 56, inspectionDue: '2026-09-20', permit: 'pending' },
  { id: 'SIGNAL-8', kind: 'signal', district: 'District North', dependsOn: ['ROAD-142'], criticality: 2, condition: 81, inspectionDue: '2026-10-01', permit: 'not-required' },
  { id: 'HOSP-ACCESS', kind: 'hospital-access', district: 'District North', dependsOn: ['ROAD-142'], criticality: 5, condition: 90, inspectionDue: '2026-10-30', permit: 'not-required' },
]
export function downstreamOf(id: string, network: readonly Asset[]): Asset[] {
  const found = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const asset of network) {
      if (!found.has(asset.id) && asset.dependsOn.some(parent => found.has(parent))) {
        found.add(asset.id)
        changed = true
      }
    }
  }
  return network.filter(asset => asset.id !== id && found.has(asset.id))
}
export function interventionFindings(id: string, network: readonly Asset[], asOf: string): string[] {
  const asset = network.find(item => item.id === id)
  if (!asset) return ['Asset was not found.']
  const findings: string[] = []
  if (asset.permit === 'pending') findings.push('Permit approval is pending.')
  if (asset.inspectionDue < asOf) findings.push('Inspection is overdue.')
  for (const dependencyId of asset.dependsOn) {
    const dependency = network.find(item => item.id === dependencyId)
    if (!dependency) findings.push(`Missing dependency ${dependencyId}.`)
    else if (dependency.condition < 50) findings.push(`${dependencyId} condition must be reviewed first.`)
  }
  if (downstreamOf(id, network).some(item => item.kind === 'hospital-access')) findings.push('Hospital access requires a continuity plan.')
  return findings
}
export function impactScore(id: string, network: readonly Asset[]): number {
  return downstreamOf(id, network).reduce((total, asset) => total + asset.criticality, network.find(asset => asset.id === id)?.criticality ?? 0)
}
