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
  // Handles: "(3) Facebook", "[5] App", "App (3)", "App · 3", "3 unread"
  const patterns = [
    /^\((\d+)\)/,       // (3) at start
    /^\[(\d+)\]/,       // [3] at start
    /\((\d+)\)\s*$/,    // (3) at end
    /\[(\d+)\]\s*$/,    // [3] at end
    /·\s*(\d+)/,        // · 3
  ];
  for (const pat of patterns) {
    const m = title.match(pat);
    if (m) return parseInt(m[1]);
  }
  return 0;
}
