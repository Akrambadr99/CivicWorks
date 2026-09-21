import { describe, expect, it } from 'vitest'
import { assets, downstreamOf, impactScore, interventionFindings } from './assetNetwork'
describe('infrastructure dependencies', () => {
  it('traverses all downstream dependents without including the source', () => {
    expect(downstreamOf('WATER-19', assets).map(item => item.id)).toEqual(['ROAD-142', 'SIGNAL-8', 'HOSP-ACCESS'])
  })
  it('combines permit, upstream condition, and continuity findings', () => {
    expect(interventionFindings('ROAD-142', assets, '2026-09-14')).toEqual([
      'Permit approval is pending.', 'WATER-19 condition must be reviewed first.', 'Hospital access requires a continuity plan.',
    ])
  })
  it('detects inspection expiration and missing assets', () => {
    expect(interventionFindings('WATER-19', assets, '2026-09-14')).toContain('Inspection is overdue.')
    expect(interventionFindings('ABSENT', assets, '2026-09-14')).toEqual(['Asset was not found.'])
  })
  it('scores linked service impact', () => {
    expect(impactScore('ROAD-142', assets)).toBe(9)
  })
})
