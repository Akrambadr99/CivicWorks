import { requireThat } from '../workspace/values'
export const workflowKey = "resident-impact"
export const workflowLabel = "Resident impact limits"
export const ruleKind = "threshold"
export interface ResidentImpactRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: ResidentImpactRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Affected households exceed Maximum planned households.')
  requireThat(record.evidence.trim().length >= 8, 'Resident impact limits require traceable evidence.')
  requireThat(record.revision > 0, 'Resident impact limits require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
