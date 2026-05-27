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

function reducer(state: TabCounts, action: { key: string; count: number }): TabCounts {
  if (state[action.key] === action.count) return state;
  return { ...state, [action.key]: action.count };
}

interface NotifyMeta {
  name: string;
  tabLabel?: string;
}

interface NotificationContextValue {
  counts: Record<number, number>; // upId -> total across all tabs
  setCount: (upId: number, tabId: string, count: number, meta?: NotifyMeta) => void;
  clearCount: (upId: number) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  counts: {},
  setCount: () => {},
  clearCount: () => {},
});

/** Last count we notified for per (upId, tabId) to avoid spamming. */
const lastNotified = new Map<string, number>();

function maybeSendNativeNotification(
  upId: number,
  tabId: string,
  count: number,
  meta?: NotifyMeta,
) {
  const key = `${upId}-${tabId}`;
  const previous = lastNotified.get(key) ?? 0;
  lastNotified.set(key, count);

  if (!isDesktop() || count <= 0 || count <= previous) return;

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
    (upId: number, tabId: string, count: number, meta?: NotifyMeta) => {
      const key = `${upId}-${tabId}`;
      dispatch({ key, count });
      maybeSendNativeNotification(upId, tabId, count, meta);
    },
    [],
  );

  const clearCount = useCallback((upId: number) => {
    const prefix = `${upId}-`;
    Object.keys(tabCountsRef.current).forEach((key) => {
      if (key.startsWith(prefix)) {
        dispatch({ key, count: 0 });
        // Preserve lastNotified at the current count rather than resetting to 0.
        // Resetting to 0 caused a notification loop: the webview title still shows
        // the old unread count after the user opens the platform (the messages
        // haven't been read yet), so the next page-title-updated / syncTitle call
        // would see count > 0 > previous and fire another notification banner.
        // By keeping lastNotified at the current count, duplicate banners are
        // suppressed. When the user actually reads the messages, the webview title
        // clears (count drops to 0), maybeSendNativeNotification updates
        // lastNotified to 0, and the next genuinely new message will notify again.
        lastNotified.set(key, tabCountsRef.current[key] ?? 0);
      }
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
    <NotificationContext.Provider value={{ counts, setCount, clearCount }}>
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
