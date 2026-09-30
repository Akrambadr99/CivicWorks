import type { InterventionCollection } from './interventionCollection'

type Record = InterventionCollection['interventions'][number]
function selected(path: string, id: string) { return path + (path.includes('?') ? '&' : '?') + 'record=' + encodeURIComponent(id) }
export function recordDetailPath(record: Record) { return selected('/assets/ROAD-142/network', record.id) }
export function recordDecisionPath(record: Record) { return selected('/programs/CAP-2027/budget/2027', record.id) }
