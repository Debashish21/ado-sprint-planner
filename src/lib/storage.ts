import { LocalStorage } from "@raycast/api";
import { LocalStatus, SprintPlan } from "./types";

const PLAN_KEY = "sprint-plan";
const STATUS_KEY = "local-status"; // Record<number, LocalStatus>, personal workflow status
const DEFERRED_KEY = "local-deferred"; // number[] of shelved work-item ids

export async function getPlan(): Promise<SprintPlan | undefined> {
  const raw = await LocalStorage.getItem<string>(PLAN_KEY);
  return raw ? (JSON.parse(raw) as SprintPlan) : undefined;
}

export async function savePlan(plan: SprintPlan): Promise<void> {
  await LocalStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

/**
 * Pin a work item to the front of the saved plan's order so it lands in Today —
 * used for ad-hoc "Move to Today". Creates a minimal plan if none exists yet.
 */
export async function pinToToday(id: number): Promise<void> {
  const plan = await getPlan();
  const order = plan ? [id, ...plan.order.filter((x) => x !== id)] : [id];
  await savePlan({
    iterationId: plan?.iterationId ?? "",
    generatedAt: new Date().toISOString(),
    order,
  });
}

// --- Local status (Not Started / In Progress / Done) ---

export async function getStatusMap(): Promise<Map<number, LocalStatus>> {
  const raw = await LocalStorage.getItem<string>(STATUS_KEY);
  const record = raw ? (JSON.parse(raw) as Record<number, LocalStatus>) : {};
  const map = new Map<number, LocalStatus>();
  for (const [id, status] of Object.entries(record)) {
    map.set(Number(id), status);
  }
  return map;
}

export async function setStatus(
  id: number,
  status: LocalStatus,
): Promise<Map<number, LocalStatus>> {
  const map = await getStatusMap();
  // "not-started" is the default, so drop it from storage to keep the map lean.
  if (status === "not-started") map.delete(id);
  else map.set(id, status);
  const record: Record<number, LocalStatus> = {};
  for (const [k, v] of map) record[k] = v;
  await LocalStorage.setItem(STATUS_KEY, JSON.stringify(record));
  return map;
}

// --- Deferred (shelved) items ---

export async function getDeferredSet(): Promise<Set<number>> {
  const raw = await LocalStorage.getItem<string>(DEFERRED_KEY);
  return new Set<number>(raw ? (JSON.parse(raw) as number[]) : []);
}

export async function setDeferred(
  id: number,
  deferred: boolean,
): Promise<Set<number>> {
  const set = await getDeferredSet();
  if (deferred) set.add(id);
  else set.delete(id);
  await LocalStorage.setItem(DEFERRED_KEY, JSON.stringify([...set]));
  return set;
}
