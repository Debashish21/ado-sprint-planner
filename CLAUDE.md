# CLAUDE.md — ADO Sprint Planner (Raycast extension)

Context and working agreement for anyone (including Claude Code) picking this up. Read this first.

## What this is

A **personal** Raycast extension for Azure DevOps. At sprint level it shows my current-sprint work items, my own progress, and a day-by-day to-do generated from the sprint's remaining working days — so each day I open "Today", work the list, and check things off. Built for personal use on a work laptop.

## Why Raycast (not a native app)

The original idea was a native macOS notch app. The work laptop's MDM **blocks all unapproved/unsigned apps**, which kills any self-built `.app` (same wall that blocks unlisted software). Raycast is installed and available, and Raycast extensions are React + TypeScript, so the whole thing lives inside an approved host with zero install/signing friction. The menu-bar command is the "glanceable" surface that replaces the notch idea.

## Product decisions (locked — don't silently change these)

1. **Progress = personal.** "Sprint vs total" means **my done / my total**, not team-wide. Shown in the My Sprint title.
2. **Local status is the source of truth for "done".** Each item carries a 3-stage **local status** (Not Started / In Progress / Done) stored only in Raycast — a personal planning layer over ADO. It drives the done/total count, the To-Do/Done split, and Plan Sprint allocation. Set it by landing on a row and pressing **`Tab`** (a "Set Status" dropdown). ADO's `System.State` is shown as a **muted, view-only** tag beside it and never drives anything.
3. **Nothing auto-writes to ADO.** Writing a work item happens **only** via the explicit "Mark Done in ADO" / "Also Push to ADO" actions. Local status and defer are purely local.
4. **Deferred = a local shelf.** Any item can be deferred (local-only, `local-deferred`); deferred items drop out of My Sprint, Plan Sprint, Today, and the menu bar, and collapse into a "Deferred" section in My Tickets (reversible via Un-Defer).
5. **Only open items are fetched.** Terminal states (Closed / Resolved / Completed / Rejected / Removed) are filtered out at the WIQL level via ADO's state *categories* (see `getOpenStates` below), so closed work disappears from every view. This is intentional — there is no "show closed" surface.
6. **The plan is a rolling queue, not fixed-date allocation.** A saved plan is an *ordered list of ids* (`SprintPlan.order`); the day-by-day view is **projected live** (`projectPlan`) from that order + remaining working days + capacity. Unfinished work rolls into today automatically — nothing strands on a past date.
7. **Spillover is explicit, never hidden.** The projection schedules only what fits (capacity × remaining days) and surfaces the rest in an "At risk" bucket with one-tap Defer. It is never dumped onto the last day.
8. **Two sequencing modes; guardrails stay deterministic.** Default **Deterministic** ordering (sprint-first → in-progress → priority → Bug/Story/Task → id) is offline and reliable. Optional **Auto (AI)** uses a Gemini free-tier key to sequence smarter, but the AI **decides order only** — its output is validated against known ids and fed through the same `projectPlan`, so capacity/fit/spillover/rolling are always deterministic. Re-plan is explicit (a user action), never automatic.
9. **The planner pool is sprint + backlog.** With `includeBacklog` (default on), the planner also pulls my *other* open assigned tickets from outside the current sprint (`getPlannerItems`), tagged `inSprint: false` and ranked *behind* the whole sprint block, so backlog work gets closed without ever outranking sprint commitments. Backlog rows carry a "Backlog" tag; whatever doesn't fit lands in the "At risk" overflow. Turn the toggle off for a sprint-only plan.

## Architecture

Commands (each is a manifest entry + a file in `src/`):

| Command        | File                    | Mode      | Purpose |
|----------------|-------------------------|-----------|---------|
| My Sprint      | `src/my-sprint.tsx`     | view      | Current-sprint items, grouped To-Do / Done **by local status**; personal done/total in title. Muted ADO-state tag + color-coded local-status tag per row. |
| My Tickets     | `src/my-tickets.tsx`    | view      | Every **open** item assigned to me project-wide (no sprint/team filter), grouped by iteration path, with a bottom "Deferred" section. |
| Plan Sprint    | `src/plan-sprint.tsx`   | view      | Live day-by-day projection with a **fit summary** + **"At risk" overflow**; Save, Do-Next reorder, **Re-plan (Smart)** / **Re-plan with AI**, Defer. |
| Today's To-Do  | `src/today.tsx`         | view      | First day's slice of the live projection (auto-rolls unfinished work); set local status (`Tab`) + optional ADO push. |
| Sprint Glance  | `src/sprint-menubar.tsx`| menu-bar  | `projectPlan(...).todays` count (open, non-deferred), in the macOS menu bar. |

`My Sprint` also supports multiple teams: the `team` preference is primary, and comma-separated `teams` adds more, each queried in its own team context and tagged with `WorkItem.team` (see `configuredTeams()` in `ado.ts`).

Shared library (`src/lib/`):

- `ado.ts` — ADO REST client. `getCurrentIteration()` (team's current sprint + dates), `getMySprintItems()` (WIQL `@CurrentIteration` + `@Me` per configured team → batch field fetch, priority-ordered), `getMyTickets()` (WIQL `@Me` project-wide, no iteration filter — backs My Tickets), `getPlannerItems(includeBacklog)` (sprint items tagged `inSprint:true`, plus — when on — my other open tickets tagged `inSprint:false`; the planner/Today/menu-bar pool), `setWorkItemDone(id)` (PATCH state — needs write PAT). **Open-state filtering:** `getOpenStates()` auto-detects which states count as open by reading ADO's per-type state definitions and keeping the `Proposed` + `InProgress` **categories**, plus any state named in the `extraOpenStates` preference (default `Failed` — failed/rework work ADO may categorize as terminal; only names that actually exist in the process are kept, so WIQL stays valid); result cached in `LocalStorage` (`open-states-cache`) for **7 days**, invalidated on org/project **or `extraOpenStates`** change. Both WIQL builders inject `stateFilterClause()` (`[System.State] IN (…open…)`), which falls back to excluding `Removed` + `doneState` if the state lookup fails.
- `plan.ts` — `remainingWorkingDays()` (Mon–Fri from today→sprint end), `orderItems()` (deterministic default sequence), `projectPlan()` (live rolling projection → `perDay`/`todays`/`overflow`/fit), `reconcileOrder()` (merge an AI/manual order with the default, dropping gaps). `allocate()` is gone.
- `ai-plan.ts` — `aiOrderItems(items, apiKey)`: Gemini `generateContent` (model `gemini-3.1-flash-lite` — the account's available free-tier model; `GEMINI_MODEL` const, swappable; structured JSON id-array) via global `fetch`. Returns ids **restricted to the known set + deduped**; throws on any error so callers fall back to `orderItems`.
- `storage.ts` — Raycast `LocalStorage` helpers: the saved `SprintPlan` (`getPlan`/`savePlan`, `pinToToday` to prepend an id), the local **status map** (`local-status`: id→`LocalStatus`, `getStatusMap`/`setStatus`) and the **deferred set** (`local-deferred`: shelved ids, `getDeferredSet`/`setDeferred`).
- `status.ts` — local-status presentation: `statusLabel`, `statusColor` (SecondaryText / Blue / Green), `statusIcon` (Circle / CircleProgress50 / CheckCircle).
- `status-actions.tsx` — `StatusSubmenu`: the shared "Set Status" dropdown (`ActionPanel.Submenu`) bound to **`Tab`**; writes via `setStatus` then calls `onChange` so the caller can revalidate. With `allowMoveToToday` (My Sprint / My Tickets) it also offers **Move to Today** → `pinToToday` (ad-hoc: pins the item to the front of the saved plan so Today surfaces it).
- `ui.ts` — shared view helpers: `typeIcon`, `workItemAccessories` (priority + muted ADO tag + status tag), `markWorkItemDone` (toast-wrapped ADO push).
- `use-local-layer.ts` — `useLocalLayer()` hook: status + deferred in a cached source (see data flow).
- `types.ts` — `Preferences` (incl. `geminiApiKey?`, `planMode?`, `includeBacklog?`), `WorkItem` (incl. `inSprint?`), `Iteration`, `SprintPlan` (`{ iterationId, generatedAt, order: number[] }`), `LocalStatus`.

Data flow: current iteration → WIQL (open states only) for my IDs → batch fetch fields → `orderItems` default sequence → (Plan Sprint) save an **`order`**; Plan Sprint / Today / Menu Bar each `projectPlan(order, openItems, remainingDays, capacity)` **live** to get per-day buckets / today's slice / overflow. Each view loads its ADO items and its **local layer (status + deferred) in a separate `useCachedPromise`** so the local layer is correct from the first paint on reopen (avoids the flash where deferred items briefly rendered in the wrong section).

## Tech / conventions

- Raycast API + `@raycast/utils` (`useCachedPromise` for all fetches).
- ADO auth: PAT via Basic header (`:<pat>` base64). PAT stored as a `password` preference (Keychain).
- WIQL runs in **team context** (team is in the request URL), so `@CurrentIteration` resolves to that team's sprint. The **team preference is what defines "this sprint."**
- Uses global `fetch` (Raycast's Node runtime provides it).
- Keep WIQL's priority ordering intact through the batch fetch (see the id-reorder step in `ado.ts`).
- **Open-item filtering is category-based, not name-based** — driven by ADO's `Proposed`/`InProgress` state categories via `getOpenStates()`, so it works across any process template without hard-coding state names. `doneState` is only a fallback filter and the write-target for the ADO-push actions.
- **Two cached sources per view.** Keep the slow ADO fetch and the instant local layer (status + deferred) in separate `useCachedPromise` calls; don't stuff the local sets into `useState` populated inside the ADO promise (that was the reopen flicker). Local edits (`setStatus`/`setDeferred`) just `revalidate` the local source — no ADO refetch.

## Interactions & shortcuts

Shortcuts are **preset in code** (not user-configurable — see the parked item below). Current bindings:

| Action | Shortcut | Screens |
|---|---|---|
| Open in ADO (primary) | `⏎` | all views |
| Set Status (dropdown) | `Tab` | My Sprint, My Tickets, Today |
| Defer / Un-Defer | `⌘D` | My Tickets |
| Mark Done in ADO / Also Push to ADO | `⌘⇧P` | My Sprint, My Tickets / Today |
| Refresh | `⌘R` | all views |

Notes:
- `Set Status` is an `ActionPanel.Submenu` bound to bare `Tab` (a valid Raycast key, but modifier-less shortcuts are occasionally swallowed by Raycast nav — verify in the running app; it's always reachable via `⌘K`).
- Raycast does **not** let end users remap individual action shortcuts (only whole-command hotkeys), so any per-action mapping must be built into the extension.
- **Parked:** a user-facing "map shortcuts at my convenience" settings surface. Investigated — Raycast has no keystroke-recorder input; a "record" screen can only be faked with hidden actions over a curated combo set. Deferred; shortcuts stay preset at the code level for now.

## Status — done

- ✅ All five commands implemented and wired (My Sprint, My Tickets, Plan Sprint, Today's To-Do, Sprint Glance).
- ✅ ADO client: current iteration, my sprint items (multi-team), project-wide tickets, state update.
- ✅ Deterministic daily planner + persistence.
- ✅ Local check-off with optional ADO push.
- ✅ **3-stage local status** (Not Started / In Progress / Done) as the source of truth for "done", set via the `Tab` "Set Status" dropdown; ADO state shown as a muted view-only tag.
- ✅ **Deferred items** — local shelf; hidden from planning views, collapsible "Deferred" section in My Tickets.
- ✅ **Open-only fetch** via auto-detected ADO state categories, weekly-cached (`getOpenStates`) — closed/resolved/completed/removed drop out everywhere.
- ✅ **Reopen-flicker fix** — local status/deferred layer loaded in its own cached source (correct from first paint).
- ✅ **Smart planner** — rolling `order` + live `projectPlan` (auto-rolls unfinished work), fit summary, explicit "At risk" overflow (no last-day dump), in-progress-first ordering, Do-Next reorder.
- ✅ **Auto (AI) sequencing** via Gemini free tier (`ai-plan.ts`, model `gemini-3.1-flash-lite`) — opt-in "Re-plan with AI"; AI decides order only, validated + reconciled + fed through the deterministic projection, graceful fallback.
- ✅ **Sprint + backlog pool** (`getPlannerItems`, `includeBacklog` default on) — plans my other open tickets behind the sprint block (tagged "Backlog") so they get closed; sprint-only when toggled off.
- ✅ **Move to Today** — extra option in the `Tab` dropdown (My Sprint / My Tickets) → `pinToToday` for ad-hoc requests.
- ✅ **Extra open states** (`extraOpenStates` pref, default `Failed`) — failed/rework work stays visible even when ADO categorizes it as terminal.
- ✅ Manifest, tsconfig, eslint config, README, .gitignore.
- ✅ `npx tsc --noEmit` and `ray lint`'s ESLint pass clean (fixed the `@types/react`/`@types/node` pin — `@raycast/api` requires `@types/react@19.0.10`, the scaffold had `18.3.3`, which caused JSX type errors across every command). Only pre-existing Title-Case warnings on "Copy ID" remain (harmless).
- ✅ `assets/extension-icon.png` is a real 512×512 PNG (the scaffolded file was a JPEG mislabeled `.png`; `ray lint`'s image-format check now passes).

## Status — not done / verify first

- ⚠️ `ray lint`'s manifest/author validation needs network access to raycast.com from Node — if that fails with a TLS/cert error in your environment (proxy/MITM cert not in Node's CA store) it's an environment issue, not a code bug; the `author: "debashish"` value itself is unverified until that check can run.
- ⚠️ **Done-state name** (`doneState` preference) is now only the **write-target** for the ADO-push actions and the **fallback** open-filter; open/closed filtering is normally category-based (`getOpenStates`). Still set it to match your process (Agile `Closed`, Scrum/Basic `Done`) so pushes and the fallback are correct.
- ⚠️ **Open-state auto-detection** needs the state-definitions API to succeed. If it fails (PAT scope/network) the view silently falls back to excluding only `Removed` + `doneState`, so multiple terminal states (e.g. `Resolved`) may reappear — that's the signal the category lookup didn't run.
- ⚠️ **`Tab` for Set Status** needs live verification (see Interactions note); reachable via `⌘K` regardless.
- ⚠️ **Verified against a real ADO org for fetching/filtering/status** (works). The ADO-**write** paths (`setWorkItemDone`) remain lightly exercised; field names assume standard `System.*` / `Microsoft.VSTS.*`.
- ⚠️ Capacity is **items-per-day**, not story points (`projectPlan`/`orderItems` count items).
- ⚠️ **Auto (AI) mode** is unverified against a live Gemini key end-to-end — the call shape (`gemini-3.1-flash-lite` `generateContent` + `responseSchema`) and the reconcile/fallback logic are in place but need a real key + over/under-capacity run. Titles are sent to Google in this mode (privacy). Free-tier model landscape shifts (Pro left the free tier Apr 2026) — if the model ever 404s or a better free model appears, update `GEMINI_MODEL` in `ai-plan.ts`.

## Roadmap (next steps, roughly ordered)

1. First-run test against real ADO; fix any field/state mismatches.
2. Story-point-based capacity option in the planner (`WorkItem.storyPoints` already fetched).
3. Parent-child clustering (tasks under their story) — needs an ADO relations fetch; also sharpens AI grouping.
4. Ticket **Detail** view (markdown: description + acceptance criteria).
5. Later, from the broader vision: notes surface, quick-assistant, and Outlook scheduling via a Power Automate flow triggered by the extension.

## Run

```bash
npm install
npm run dev     # ray develop — opens in Raycast, hot-reloads
```
Fill preferences on first launch: PAT, organization, project, team, done state, daily capacity. Optional: **Extra Open States** (default `Failed`), **Include Backlog** (default on), **Planner Mode** (Deterministic / Auto) + a **Gemini API key** for Auto (AI) sequencing.

## Verify next (this session's work is unrun against live services)

The whole smart-planner + AI + backlog + Failed-states + Move-to-Today set is code-complete and passes `tsc`/ESLint but is **not yet exercised in the running app**. Next session: `npm run dev` and confirm — over/under-capacity fit + "At risk" overflow, unfinished work rolling into Today, backlog items tagged behind sprint, `Tab` → Move to Today, Failed items reappearing after a ⌘R state-cache refresh, and a real `⌘⇧R` AI re-plan with a Gemini key.
