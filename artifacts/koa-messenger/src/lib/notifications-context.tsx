import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useReducer,
} from "react";
import { isDesktop } from "./desktop";

type TabCounts = Record<string, number>; // key: `${upId}-${tabId}`

type CountAction =
  | { type: "set"; key: string; count: number }
  | { type: "remove"; keys: string[] };

function reducer(state: TabCounts, action: CountAction): TabCounts {
  if (action.type === "set") {
    if (state[action.key] === action.count) return state;
    return { ...state, [action.key]: action.count };
  }
  const keys = action.keys.filter((k) => k in state);
  if (keys.length === 0) return state;
  const next = { ...state };
  for (const k of keys) delete next[k];
  return next;
}

interface NotifyMeta {
  name: string;
  tabLabel?: string;
}

interface NotificationContextValue {
  counts: Record<number, number>; // upId -> total across all tabs
  setCount: (
    upId: number,
    tabId: string,
    count: number,
    meta?: NotifyMeta,
    /** True when this pane is the one the user is currently viewing. */
    active?: boolean,
  ) => void;
  clearCount: (upId: number) => void;
  /** Drop all state for a single tab (e.g. when the user closes it). */
  removeCount: (upId: number, tabId: string) => void;
  /** Drop state for any platform not in validUpIds (e.g. removed platforms). */
  pruneCounts: (validUpIds: Iterable<number>) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  counts: {},
  setCount: () => {},
  clearCount: () => {},
  removeCount: () => {},
  pruneCounts: () => {},
});

/** Last count we notified for per (upId, tabId) to avoid spamming. */
const lastNotified = new Map<string, number>();

function maybeSendNativeNotification(
  upId: number,
  tabId: string,
  count: number,
  meta?: NotifyMeta,
  active?: boolean,
) {
  const key = `${upId}-${tabId}`;
  const previous = lastNotified.get(key) ?? 0;

  // FOREGROUND pane (the user is currently looking at it). Everything in it is
  // already "seen", so never raise a banner for it — and track the baseline all
  // the way down to 0 as the messages are read. This down-tracking is what
  // resets the high-water mark after a read: without it the baseline stayed
  // stuck at the last unread count, so the NEXT genuinely-new message of the
  // same (or lower) count — e.g. a fresh "(1)" after you'd read the previous
  // one — was silently dropped.
  if (active) {
    if (previous !== count) lastNotified.set(key, count);
    return;
  }

  // BACKGROUND pane. A zero/blank count here is almost always the platform
  // BLINKING its tab title (e.g. WhatsApp/Messenger alternate "(1) App" ⇄ "App"
  // once a second to grab attention) — NOT a genuine "all read" signal (real
  // reads are caught by the foreground branch above). If we let that transient
  // 0 lower the high-water mark, the very next blink back to "(1)" looks like a
  // brand-new message (count 1 > previous 0) and re-fires the banner, looping
  // for as long as the message stays unread. So ignore it entirely and DON'T
  // touch lastNotified.
  if (count <= 0) return;

  // Only now (a real, positive count) do we update the baseline.
  lastNotified.set(key, count);

  if (!isDesktop() || count <= previous) return;

  const desktop = window.koaDesktop;
  if (!desktop?.sendNotification) return;

  const platformName = meta?.name ?? "KoaMessenger";
  const tabLabel = meta?.tabLabel ? ` (${meta.tabLabel})` : "";
  const diff = count - previous;

  desktop.sendNotification(
    `${platformName}${tabLabel}`,
    diff === 1
      ? `1 new message`
      : `${diff} new messages (${count} total)`,
    `${platformName}${tabLabel}`,
    upId,
  );
}

function updateDockBadge(total: number) {
  if (!isDesktop()) return;
  window.koaDesktop?.setBadgeCount?.(total);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [tabCounts, dispatch] = useReducer(reducer, {});

  // Keep a ref to the latest counts so callbacks don't need to depend on them
  // (avoids re-running effects on every count change).
  const tabCountsRef = useRef(tabCounts);
  tabCountsRef.current = tabCounts;

  const setCount = useCallback(
    (
      upId: number,
      tabId: string,
      count: number,
      meta?: NotifyMeta,
      active?: boolean,
    ) => {
      const key = `${upId}-${tabId}`;
      dispatch({ type: "set", key, count });
      maybeSendNativeNotification(upId, tabId, count, meta, active);
    },
    [],
  );

  const removeCount = useCallback((upId: number, tabId: string) => {
    const key = `${upId}-${tabId}`;
    lastNotified.delete(key);
    dispatch({ type: "remove", keys: [key] });
  }, []);

  const pruneCounts = useCallback((validUpIds: Iterable<number>) => {
    const valid = new Set(validUpIds);
    const isStale = (key: string) => {
      const upId = parseInt(key.split("-")[0]);
      return !isNaN(upId) && !valid.has(upId);
    };
    for (const key of Array.from(lastNotified.keys())) {
      if (isStale(key)) lastNotified.delete(key);
    }
    const staleKeys = Object.keys(tabCountsRef.current).filter(isStale);
    if (staleKeys.length > 0) dispatch({ type: "remove", keys: staleKeys });
  }, []);

  const clearCount = useCallback((upId: number) => {
    const prefix = `${upId}-`;
    // Clear the unread badge as soon as the user opens the platform. The
    // notification baseline (lastNotified) is NOT touched here — it's managed by
    // maybeSendNativeNotification's foreground branch, which tracks the count
    // down to 0 as the messages are actually read. (Forcing it to 0 here instead
    // re-fired a banner, because the webview title still shows the old unread
    // count for a moment after opening, before the messages are marked read.)
    Object.keys(tabCountsRef.current).forEach((key) => {
      if (key.startsWith(prefix)) dispatch({ type: "set", key, count: 0 });
    });
  }, []);

  const counts = useMemo<Record<number, number>>(() => {
    const result: Record<number, number> = {};
    for (const [key, count] of Object.entries(tabCounts)) {
      const upId = parseInt(key.split("-")[0]);
      if (!isNaN(upId)) result[upId] = (result[upId] ?? 0) + count;
    }
    return result;
  }, [tabCounts]);

  const totalUnread = useMemo(
    () => Object.values(counts).reduce((sum, c) => sum + c, 0),
    [counts],
  );

  useEffect(() => {
    updateDockBadge(totalUnread);
  }, [totalUnread]);

  return (
    <NotificationContext.Provider
      value={{ counts, setCount, clearCount, removeCount, pruneCounts }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

/** Hook to listen for native notification clicks (desktop only). */
export function useDesktopNotificationClick(callback: (upId: number) => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!isDesktop()) return;
    const unsub = window.koaDesktop?.onNotificationClick?.((upId: number) => {
      cbRef.current(upId);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);
}

export function parseUnreadFromTitle(title: string): number {
  if (!title) return 0;
  const patterns = [
    /^\((\d+)\)/,
    /^\[(\d+)\]/,
    /\((\d+)\)\s*[-–|]/,
    /\|\s*(\d+)\s*new/i,
    /·\s*(\d+)\s*(new|unread)?/i,
    /\b(\d+)\s+unread/i,
    /\b(\d+)\s+new\s+message/i,
    /\((\d+)\)\s*$/,
    /\[(\d+)\]\s*$/,
    /\s(\d+)\s*$/,
  ];
  for (const pat of patterns) {
    const m = title.match(pat);
    if (m) {
      const n = parseInt(m[1]);
      if (n > 0 && n < 10000) return n;
    }
  }
  return 0;
}
