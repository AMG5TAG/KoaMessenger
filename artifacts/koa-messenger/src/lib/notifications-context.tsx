import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

type TabCounts = Record<string, number>; // key: `${upId}-${tabId}`

function reducer(state: TabCounts, action: { key: string; count: number }): TabCounts {
  if (state[action.key] === action.count) return state;
  return { ...state, [action.key]: action.count };
}

interface NotificationContextValue {
  counts: Record<number, number>; // upId -> total across all tabs
  setCount: (upId: number, tabId: string, count: number) => void;
  clearCount: (upId: number) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  counts: {},
  setCount: () => {},
  clearCount: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [tabCounts, dispatch] = useReducer(reducer, {});

  const setCount = useCallback((upId: number, tabId: string, count: number) => {
    dispatch({ key: `${upId}-${tabId}`, count });
  }, []);

  const clearCount = useCallback((upId: number) => {
    // Set all tabs for this upId to 0 by dispatching a wildcard reset isn't possible
    // with the reducer as-is; instead we dispatch 0 for every key matching upId.
    Object.keys(tabCounts).forEach((key) => {
      if (key.startsWith(`${upId}-`)) dispatch({ key, count: 0 });
    });
  }, [tabCounts]);

  const counts = useMemo<Record<number, number>>(() => {
    const result: Record<number, number> = {};
    for (const [key, count] of Object.entries(tabCounts)) {
      const upId = parseInt(key.split("-")[0]);
      if (!isNaN(upId)) result[upId] = (result[upId] ?? 0) + count;
    }
    return result;
  }, [tabCounts]);

  return (
    <NotificationContext.Provider value={{ counts, setCount, clearCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function parseUnreadFromTitle(title: string): number {
  if (!title) return 0;
  // Ordered from most specific to least to avoid false matches.
  const patterns = [
    /^\((\d+)\)/,                   // (3) App name  — WhatsApp, Messenger, Gmail, Discord, Telegram
    /^\[(\d+)\]/,                   // [3] App name
    /\((\d+)\)\s*[-–|]/,           // (3) - Gmail, (3) | Slack
    /\|\s*(\d+)\s*new/i,           // | 3 new
    /·\s*(\d+)\s*(new|unread)?/i,  // · 3 new  — Telegram Web
    /\b(\d+)\s+unread/i,           // 3 unread
    /\b(\d+)\s+new\s+message/i,    // 3 new messages
    /\((\d+)\)\s*$/,               // App name (3)  — at end
    /\[(\d+)\]\s*$/,               // App name [3]  — at end
    /\s(\d+)\s*$/,                 // App name 3    — plain number at very end (low confidence, last resort)
  ];
  for (const pat of patterns) {
    const m = title.match(pat);
    if (m) {
      const n = parseInt(m[1]);
      if (n > 0 && n < 10000) return n; // sanity-check: ignore wild numbers
    }
  }
  return 0;
}
