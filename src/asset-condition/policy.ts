import { requireThat } from '../workspace/values'
export const workflowKey = "asset-condition"
export const workflowLabel = "Asset condition freshness"
export const ruleKind = "freshness"
export interface AssetConditionRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: AssetConditionRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured <= record.limit, 'Inspection age (days) exceed Maximum inspection age.')
  requireThat(record.evidence.trim().length >= 8, 'Asset condition freshness require traceable evidence.')
  requireThat(record.revision > 0, 'Asset condition freshness require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
