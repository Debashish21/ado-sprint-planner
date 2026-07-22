import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCurrentIteration, getPlannerItems } from "./lib/ado";
import { getPlan, setStatus } from "./lib/storage";
import { statusColor, statusIcon, statusLabel } from "./lib/status";
import { StatusSubmenu } from "./lib/status-actions";
import { useLocalLayer } from "./lib/use-local-layer";
import { markWorkItemDone } from "./lib/ui";
import { orderItems, projectPlan, remainingWorkingDays } from "./lib/plan";
import { Preferences, WorkItem } from "./lib/types";

export default function Today() {
  const prefs = getPreferenceValues<Preferences>();
  const doneState = prefs.doneState;
  const capacity = parseInt(prefs.dailyCapacity || "3", 10) || 3;
  const includeBacklog = prefs.includeBacklog !== false;

  const { data, isLoading, revalidate } = useCachedPromise(
    async (backlog: boolean) => {
      const [iteration, items, plan] = await Promise.all([
        getCurrentIteration(),
        getPlannerItems(backlog),
        getPlan(),
      ]);
      return { iteration, items, plan };
    },
    [includeBacklog],
    { keepPreviousData: true },
  );

  const { statusOf, deferred, revalidateLocal } = useLocalLayer();

  const items = data?.items ?? [];
  const byId = new Map<number, WorkItem>(items.map((i) => [i.id, i]));
  const openItems = items.filter(
    (i) => !deferred.has(i.id) && statusOf(i.id) !== "done",
  );

  // Project the saved order (or the default rank if no plan saved) onto the
  // remaining days; "today" is the first day's slice and rolls unfinished work.
  const defaultOrder = orderItems(openItems, statusOf);
  const openSorted = defaultOrder
    .map((id) => byId.get(id))
    .filter((x): x is WorkItem => Boolean(x));
  const order = data?.plan?.order ?? defaultOrder;
  const days = data
    ? remainingWorkingDays(data.iteration.startDate, data.iteration.finishDate)
    : [];
  const todays = projectPlan(order, openSorted, days, capacity).todays;

  async function pushToAdo(item: WorkItem) {
    if (await markWorkItemDone(item.id, doneState)) {
      await setStatus(item.id, "done");
      await revalidateLocal();
      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Today — ${todays.length} left`}
      searchBarPlaceholder="Today's to-do"
    >
      {todays.map((item) => {
        const status = statusOf(item.id);
        return (
          <List.Item
            key={item.id}
            icon={{ source: statusIcon(status), tintColor: statusColor(status) }}
            title={item.title}
            subtitle={`#${item.id}`}
            accessories={[
              ...(item.inSprint === false
                ? [{ tag: { value: "Backlog", color: Color.Orange } }]
                : []),
              {
                tag: { value: statusLabel(status), color: statusColor(status) },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <StatusSubmenu
                  id={item.id}
                  current={status}
                  onChange={revalidateLocal}
                />
                <Action
                  title={`Also Push to ADO (${doneState})`}
                  icon={Icon.Upload}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => pushToAdo(item)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && todays.length === 0 && (
        <List.EmptyView
          icon={Icon.Sun}
          title="Nothing to do today"
          description="All caught up — enjoy the breather, or re-plan the sprint."
        />
      )}
    </List>
  );
}
