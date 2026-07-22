import { useCachedPromise } from "@raycast/utils";
import { getDeferredSet, getStatusMap } from "./storage";
import { LocalStatus } from "./types";

/**
 * The personal planning layer (local status + deferred set) loaded in its own
 * cached source, kept separate from the slow ADO fetch so it's correct from the
 * first paint on reopen instead of flashing empty. Arrays keep it
 * JSON-serializable for Raycast's cache. `revalidateLocal` re-reads LocalStorage
 * after a local edit (no ADO refetch).
 */
export function useLocalLayer() {
  const { data, revalidate } = useCachedPromise(
    async () => {
      const [statusMap, deferredSet] = await Promise.all([
        getStatusMap(),
        getDeferredSet(),
      ]);
      return {
        statusEntries: [...statusMap] as [number, LocalStatus][],
        deferredIds: [...deferredSet],
      };
    },
    [],
    { keepPreviousData: true },
  );

  const statusMap = new Map<number, LocalStatus>(data?.statusEntries ?? []);
  const deferred = new Set<number>(data?.deferredIds ?? []);
  const statusOf = (id: number): LocalStatus =>
    statusMap.get(id) ?? "not-started";

  return { deferred, statusOf, revalidateLocal: revalidate };
}
