import { requireThat } from '../workspace/values'
export const workflowKey = "road-closure"
export const workflowLabel = "Road closure windows"
export const ruleKind = "window"
export interface RoadClosureRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: RoadClosureRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Reopening day falls outside Required reopening day.')
  requireThat(record.evidence.trim().length >= 8, 'Road closure windows require traceable evidence.')
  requireThat(record.revision > 0, 'Road closure windows require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
