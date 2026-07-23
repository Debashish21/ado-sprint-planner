import { Iteration, LocalStatus, ManualTodo, WorkItem } from "./types";

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  MOCK / DEMO DATA — FOR STORE SCREENSHOTS ONLY. REMOVE BEFORE PUBLISHING. │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Flip MOCK_MODE to `true` and every ADO fetch is replaced with the fabricated
 * data below — no network, no real tickets — so you can take clean screenshots
 * without exposing your org. Flip it back to `false` when done.
 *
 * To remove entirely before publishing: delete this file and every line tagged
 * `// MOCK` in `ado.ts` and `storage.ts` (grep -rn "MOCK" src). The extension
 * behaves identically with all of it gone.
 *
 * Tips for the screenshots:
 *  - Set **Daily Capacity = 3** in preferences so Plan Sprint shows a tight
 *    multi-day plan plus the "At risk of spillover" overflow.
 *  - The iteration window is relative to today, so the plan always has a few
 *    remaining working days no matter when you shoot.
 */
export const MOCK_MODE = false;

const ORG = "contoso";
const PROJECT = "Merlin";
const SPRINT_PATH = "Merlin\\Sprint 42";
const NEXT_SPRINT_PATH = "Merlin\\Sprint 43";
const BACKLOG_PATH = "Merlin\\Backlog";

function mockUrl(id: number): string {
  return `https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${id}`;
}

/** ISO date `days` away from today (used to keep the sprint window current). */
function isoOffset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function mockIteration(): Iteration {
  return {
    id: "demo-iteration",
    name: "Sprint 42",
    path: SPRINT_PATH,
    // A short window so a plan at capacity 3 fills a couple of days and spills.
    startDate: isoOffset(-3),
    finishDate: isoOffset(2),
  };
}

interface Seed {
  id: number;
  title: string;
  type: "User Story" | "Bug" | "Task";
  state: string;
  priority?: number;
  storyPoints?: number;
  iterationPath: string;
}

// Current-sprint work (12 items — a realistic mix of stories, bugs, tasks).
const SPRINT_SEEDS: Seed[] = [
  {
    id: 1042,
    title: "Add SSO login via SAML",
    type: "User Story",
    state: "Active",
    priority: 1,
    storyPoints: 5,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1043,
    title: "Fix token refresh race on session resume",
    type: "Bug",
    state: "Active",
    priority: 1,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1044,
    title: "Wire up rate-limit headers on the public API",
    type: "Task",
    state: "New",
    priority: 2,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1045,
    title: "Export report to CSV",
    type: "User Story",
    state: "New",
    priority: 2,
    storyPoints: 3,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1046,
    title: "Avatar upload fails for files over 5 MB",
    type: "Bug",
    state: "Failed",
    priority: 2,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1047,
    title: "Add pagination to the activity feed",
    type: "Task",
    state: "New",
    priority: 3,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1048,
    title: "Dark mode for the settings pages",
    type: "User Story",
    state: "New",
    priority: 3,
    storyPoints: 2,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1049,
    title: "Migrate cron jobs to the new scheduler",
    type: "Task",
    state: "Active",
    priority: 2,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1050,
    title: "Timezone off-by-one in due dates",
    type: "Bug",
    state: "New",
    priority: 1,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1051,
    title: "Add integration tests for the billing webhook",
    type: "Task",
    state: "New",
    priority: 3,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1052,
    title: "Inline comments on documents",
    type: "User Story",
    state: "New",
    priority: 2,
    storyPoints: 5,
    iterationPath: SPRINT_PATH,
  },
  {
    id: 1053,
    title: "Upgrade CI to Node 22",
    type: "Task",
    state: "New",
    priority: 4,
    iterationPath: SPRINT_PATH,
  },
];

// Other open assigned work outside the current sprint (backs My Tickets + the
// planner's optional backlog pool). Varied iterations so My Tickets groups them.
const BACKLOG_SEEDS: Seed[] = [
  {
    id: 1061,
    title: "Search returns stale results after an edit",
    type: "Bug",
    state: "New",
    priority: 2,
    iterationPath: NEXT_SPRINT_PATH,
  },
  {
    id: 1062,
    title: "Document the deploy runbook",
    type: "Task",
    state: "New",
    priority: 3,
    iterationPath: BACKLOG_PATH,
  },
  {
    id: 1063,
    title: "Bulk-archive old projects",
    type: "User Story",
    state: "New",
    priority: 3,
    storyPoints: 3,
    iterationPath: BACKLOG_PATH,
  },
  {
    id: 1064,
    title: "Add a health-check endpoint",
    type: "Task",
    state: "New",
    priority: 2,
    iterationPath: NEXT_SPRINT_PATH,
  },
];

function toItem(s: Seed, extra: Partial<WorkItem>): WorkItem {
  return {
    id: s.id,
    title: s.title,
    type: s.type,
    state: s.state,
    priority: s.priority,
    storyPoints: s.storyPoints,
    iterationPath: s.iterationPath,
    url: mockUrl(s.id),
    ...extra,
  };
}

export function mockSprintItems(): WorkItem[] {
  return SPRINT_SEEDS.map((s) => toItem(s, { team: "Platform" }));
}

export function mockTickets(): WorkItem[] {
  return [...SPRINT_SEEDS, ...BACKLOG_SEEDS].map((s) => toItem(s, {}));
}

export function mockPlannerItems(includeBacklog: boolean): WorkItem[] {
  const sprint = SPRINT_SEEDS.map((s) =>
    toItem(s, { team: "Platform", inSprint: true }),
  );
  if (!includeBacklog) return sprint;
  const backlog = BACKLOG_SEEDS.map((s) => toItem(s, { inSprint: false }));
  return [...sprint, ...backlog];
}

// Seed local status so My Sprint shows a real done/total split and a populated
// Done section without hand-clicking. Live Tab edits still override these.
export const MOCK_STATUS: Record<number, LocalStatus> = {
  1042: "in-progress",
  1043: "in-progress",
  1049: "in-progress",
  1047: "done",
  1048: "done",
  1051: "done",
  1053: "done",
};

// Seed one deferred item so My Tickets shows its "Deferred" section.
export const MOCK_DEFERRED: number[] = [1062];

// A real instant `days` whole days ago (robust across timezones, unlike a
// date-string + UTC-time concat, which can drift a day).
function instantDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// Seed a couple of quick notes so Today shows the "Quick Notes" section — one
// jotted today (no badge), one carried from yesterday (shows "carried 1d").
export const MOCK_NOTES: ManualTodo[] = [
  {
    id: "n-demo-1",
    text: "Follow up with Priya on the API contract wording",
    createdAt: instantDaysAgo(0),
  },
  {
    id: "n-demo-2",
    text: "Ask design for the empty-state illustration",
    createdAt: instantDaysAgo(1),
    status: "in-progress",
  },
];
