# Local Status + Deferred Items — Design

Date: 2026-07-21

> **Status: implemented, with changes.** This is the original design record. Two things evolved during build — see `CLAUDE.md` for the current behavior:
> - **Setting status** is a `Tab` "Set Status" dropdown (`StatusSubmenu` in `src/lib/status-actions.tsx`), not the `⌘P` "Cycle Status" action described below; `nextStatus` was removed. Shortcut scheme also changed (Defer `⌘D`, ADO-write `⌘⇧P`).
> - **Open/closed filtering** is now category-based auto-detection with a weekly cache (`getOpenStates` in `ado.ts`), so closed/resolved/completed items are excluded from the WIQL rather than only re-styled.

## Problem

Two gaps in the current personal workflow:

1. A handful of tickets assigned to me shouldn't show up in My Sprint, My Tickets, or Plan Sprint at all — there's no way to shelve them.
2. Progress tracking currently relies on the ADO `System.State` field (via "Mark Done in ADO"), but the user isn't using that action for now — ADO state is view-only. There's no local, actionable, color-coded progress status independent of ADO.

## Goals

- Add a **Deferred Items** mechanism: any ticket can be hidden from My Sprint, Plan Sprint, and Today, while still visible (and reversible) from My Tickets.
- Add a **3-stage local status** (Not Started / In Progress / Done), settable by the user, color-coded, and used as the source of truth for "done" in My Sprint's progress count and Plan Sprint's allocation.
- Keep ADO's `System.State` and the "Mark Done in ADO" / "Also Push to ADO" actions intact for future use — this is additive, not a replacement of ADO write support.

## Non-goals

- No migration of the existing binary `local-done` set (used by Today) into the new status map — data reset on upgrade is accepted.
- No changes to WIQL queries, iteration/team logic, or story-point planning.
- My Tickets does not filter by local status — it shows all open (non-deferred) tickets regardless of status; status is a visual badge there only.

## Data model (`src/lib/storage.ts`)

Replace the existing `local-done` key with two new `LocalStorage` entries:

- **`local-status`** — JSON `Record<number, LocalStatus>` where `LocalStatus = "not-started" | "in-progress" | "done"`. Ids absent from the map are treated as `"not-started"`.
  - `getStatusMap(): Promise<Map<number, LocalStatus>>`
  - `setStatus(id: number, status: LocalStatus): Promise<Map<number, LocalStatus>>`
- **`local-deferred`** — JSON `number[]` of deferred work-item ids.
  - `getDeferredSet(): Promise<Set<number>>`
  - `setDeferred(id: number, deferred: boolean): Promise<Set<number>>`

Remove `getDoneSet` / `setDone` (superseded by the status map).

## Status helpers (`src/lib/status.ts`, new file)

Shared logic used by My Sprint, My Tickets, and Today:

```ts
export type LocalStatus = "not-started" | "in-progress" | "done";

export function nextStatus(s: LocalStatus): LocalStatus; // cycles: not-started -> in-progress -> done -> not-started
export function statusLabel(s: LocalStatus): string;      // "Not Started" | "In Progress" | "Done"
export function statusColor(s: LocalStatus): Color;        // SecondaryText | Blue | Green
export function statusIcon(s: LocalStatus): Icon;           // Circle | CircleProgress50 | CheckCircle
```

(`LocalStatus` type actually lives wherever is cleanest — likely re-exported from `types.ts` — implementer's call; `status.ts` owns the behavior.)

## Behavior by screen

### My Sprint (`my-sprint.tsx`)
- Load `getDeferredSet()` + `getStatusMap()` alongside `getMySprintItems()`.
- Filter out any item whose id is in the deferred set — entirely excluded.
- "Done" for the title count (`done/total`) and the To-Do/Done section split is now `status === "done"`, not ADO state.
- Item icon (Bug/User Story/Task) is tinted via `statusColor`, not the old ADO-state color.
- ADO's `state` stays as a plain accessory tag (view-only).
- New action: "Cycle Status" (`cmd+p`) → `nextStatus` → `setStatus` → revalidate/re-render.
- Existing "Mark Done in ADO" action (`cmd+d`) stays, unchanged.

### My Tickets (`my-tickets.tsx`)
- Load `getDeferredSet()` + `getStatusMap()` alongside `getMyTickets()`.
- Items are **not** filtered by ADO state anymore for the main sections (currently it drops ADO-done items — this restriction is removed since local status is now what matters, and My Tickets intentionally shows everything regardless of status per this design).
- Split fetched items into:
  - Non-deferred → grouped by iteration path as today, each row showing status icon/color + a "Defer" action (`cmd+shift+d`).
  - Deferred → a single "Deferred" `List.Section` at the bottom, each row showing an "Un-defer" action (`cmd+shift+d`, same shortcut, context-appropriate label/icon flip).
- "Cycle Status" (`cmd+p`) action available on both deferred and non-deferred rows.
- Existing "Mark Done in ADO" (`cmd+d`) stays on non-deferred rows.

### Plan Sprint (`plan-sprint.tsx`)
- Load `getDeferredSet()` + `getStatusMap()` alongside `getCurrentIteration()` + `getMySprintItems()`.
- `openItems` (what gets allocated across days) excludes: deferred items, and items with `status === "done"`. Replaces the current ADO-state-based `isDone` filter.

### Today (`today.tsx`)
- Replace the binary `doneSet` with the shared `statusMap`.
- Filter today's items by the deferred set as a defensive measure (in case a saved plan predates a defer action).
- Row icon/color via `statusIcon`/`statusColor` (3-way instead of 2-way).
- "Cycle Status" replaces the old "Check Off (Local)" toggle action, same `cmd+p` shortcut used elsewhere.
- "Also Push to ADO" action stays, moved to `cmd+shift+p` (was `cmd+shift+d`) to keep `cmd+shift+d` reserved for "defer" everywhere else in the app; sets local status to `"done"` and PATCHes ADO state.
- `remaining` count = items where `status !== "done"`.

## Shortcuts (final)

| Action | Shortcut | Screens |
|---|---|---|
| Cycle Status | `cmd+p` | My Sprint, My Tickets, Today |
| Defer / Un-defer | `cmd+shift+d` | My Tickets |
| Mark Done in ADO | `cmd+d` | My Sprint, My Tickets |
| Also Push to ADO | `cmd+shift+p` | Today |

## Open questions / risks

- None outstanding — all resolved during design dialogue (see decisions above: no data migration, My Tickets shows all statuses, local status drives "done" everywhere except My Tickets' section membership).
