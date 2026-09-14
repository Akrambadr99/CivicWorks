import { requireThat } from '../workspace/values'
export const workflowKey = "materials-stock"
export const workflowLabel = "Materials reserve"
export const ruleKind = "reserve"
export interface MaterialsStockRecord { measured: number; limit: number; evidence: string; revision: number }
export function validateAuthorization(record: MaterialsStockRecord) {
  requireThat(Number.isSafeInteger(record.measured) && Number.isSafeInteger(record.limit), 'Workflow measurements must be safe integers.')
  requireThat(record.measured >= 0 && record.limit >= 0, 'Workflow measurements cannot be negative.')
  requireThat(record.measured >= record.limit, 'Available material units fall below Minimum required units.')
  requireThat(record.evidence.trim().length >= 8, 'Materials reserve require traceable evidence.')
  requireThat(record.revision > 0, 'Materials reserve require a current record revision.')
  return { authorized: true as const, fingerprint: [workflowKey, record.measured, record.limit, record.revision].join(':') }
}
export function canRoleAdvance(role: string, phase: string) {
  const matrix: Record<string, readonly string[]> = { draft: ['coordinator'], review: ['reviewer'], authorized: ['operator'], active: ['owner'], blocked: ['reviewer'] }
  return (matrix[phase] ?? []).includes(role)
}
