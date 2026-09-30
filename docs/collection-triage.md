# Collection triage

District intervention workspace now separates collection exploration from domain decisions.

## View contract

- Search, archive scope, work state, sorting, page and page size use URL parameters: `q`, `show`, `state`, `sort`, `page`, `size`. Invalid values fall back safely.
- Search replaces the current history entry; discrete filter and page changes can be navigated with browser Back/Forward. Changing a filter or sort resets paging.
- Sorts use stable record IDs to break revision ties. The default page size is 10; 5 and 25 are available under View options.
- Selected detail remains open when filtering or paging hides its row. Reset view restores the default active collection; it does not change the selected record or force archived records into the active view.
- Detail and decision links carry the collection view back to the workspace. Unrelated URL context is retained; view context is bounded to 4,000 characters.

## Selection and workflow safety

Page selection adds only visible row IDs. Clearing the current page preserves selections elsewhere. Hidden selection counts and bulk-scope guidance are visible before the existing bulk action. Clear selection removes all checked IDs. Selection is transient and does not survive a full reload or route unmount.

Global work queues and metrics remain portfolio-of-records summaries, not filtered collection summaries. Their labels state this scope. Existing permission, capacity, archival, fan-out and stale-write policies remain authoritative. Triage changes alone do not write domain records.

## Domain state

Invalid inspection evidence takes priority over the existing permit blocker, adopted funding requiring revalidation, stale funding review, open funding review and current adopted funding. Search includes intervention ID, district, linked inspection source and current named finance reviewer. The existing ROAD-142 ledger template remains the permit source for each independent intervention record.

When multiple conditions exist, the work-state facet represents the highest-priority condition above. The selected detail and global work queue preserve other evidence.

## Verification

`collectionTriage.test.ts` covers seeded states, precedence and searchable domain identity. `e2e/sixteenth-pass.spec.ts` covers deep links, reload/history, empty-view recovery, hidden page selection, and detail/decision round trips at tablet width. Existing collection and record-workspace suites remain regression coverage.
