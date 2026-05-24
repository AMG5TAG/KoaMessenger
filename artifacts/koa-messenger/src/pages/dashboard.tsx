import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useListUserPlatforms } from "@workspace/api-client-react";
import { Loader2, ExternalLink, X, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDesktop } from "@/lib/desktop";
import {
  useNotifications,
  parseUnreadFromTitle,
  useDesktopNotificationClick,
} from "@/lib/notifications-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import logoRoundPng from "@assets/Logo_-_KoaMessenger_1779504607995.png";

type Tab = { id: string; createdAt: number };

const TAB_STORAGE_KEY = "km_platform_tabs_v4";

function loadTabsForUp(upId: number): Tab[] {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, Tab[]>) : {};
    const saved = data[String(upId)];
    return saved && saved.length > 0
      ? saved
      : [{ id: `${upId}-t1`, createdAt: Date.now() }];
  } catch {
    return [{ id: `${upId}-t1`, createdAt: Date.now() }];
  }
}

function saveTabsForUp(upId: number, tabs: Tab[]) {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, Tab[]>) : {};
    data[String(upId)] = tabs;
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

type PlatformTabState = {
  tabs: Tab[];
  activeTabId: string;
};

export default function Dashboard() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const activeUpId = Number(new URLSearchParams(search).get("up") ?? "0") || null;
  const { toast } = useToast();
  const { counts } = useNotifications();
  const prevCounts = useRef<Record<number, number>>({});

  const { data: userPlatforms, isLoading: userPlatformsLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] },
  });

  // Navigate to platform when user clicks a native macOS notification banner
  useDesktopNotificationClick((upId) => setLocation(`/dashboard?up=${upId}`));

  // ── Sticky visited platforms: once loaded, never unmount ──────────────────
  // Both visitedUpIds and platformTabs are updated in the SAME effect so React
  // batches them into a single re-render.  If they were separate effects the
  // component would render null between the two updates (visitedUpIds has the
  // platform but platformTabs doesn't yet), which destroys and recreates the
  // iframe, causing a full reload on every navigation.
  const [visitedUpIds, setVisitedUpIds] = useState<number[]>([]);
  const [platformTabs, setPlatformTabs] = useState<Record<number, PlatformTabState>>({});

  useEffect(() => {
    if (!activeUpId) return;
    setVisitedUpIds((prev) => (prev.includes(activeUpId) ? prev : [...prev, activeUpId]));
    setPlatformTabs((prev) => {
      if (prev[activeUpId]) return prev; // already initialised
      const tabs = loadTabsForUp(activeUpId);
      return { ...prev, [activeUpId]: { tabs, activeTabId: tabs[0]?.id ?? "" } };
    });
  }, [activeUpId]);

  const addTab = useCallback((upId: number) => {
    setPlatformTabs((prev) => {
      const state = prev[upId];
      if (!state) return prev;
      const newTab: Tab = { id: `${upId}-t${Date.now()}`, createdAt: Date.now() };
      const next = { tabs: [...state.tabs, newTab], activeTabId: newTab.id };
      saveTabsForUp(upId, next.tabs);
      return { ...prev, [upId]: next };
    });
  }, []);

  const closeTab = useCallback((upId: number, tabId: string) => {
    setPlatformTabs((prev) => {
      const state = prev[upId];
      if (!state) return prev;
      let next = state.tabs.filter((t) => t.id !== tabId);
      let nextActive = state.activeTabId;
      if (next.length === 0) {
        const fresh: Tab = { id: `${upId}-t${Date.now()}`, createdAt: Date.now() };
        next = [fresh];
        nextActive = fresh.id;
      } else if (tabId === state.activeTabId) {
        nextActive = next[next.length - 1].id;
      }
      saveTabsForUp(upId, next);
      return { ...prev, [upId]: { tabs: next, activeTabId: nextActive } };
    });
  }, []);

  const setActiveTab = useCallback((upId: number, tabId: string) => {
    setPlatformTabs((prev) => {
      const state = prev[upId];
      if (!state || state.activeTabId === tabId) return prev;
      return { ...prev, [upId]: { ...state, activeTabId: tabId } };
    });
  }, []);

  // ── Toast when an INACTIVE platform gets a new message ───────────────────
  useEffect(() => {
    if (!userPlatforms) return;
    for (const up of userPlatforms) {
      if (up.id === activeUpId) {
        // Just update previous so switching away doesn't fire a stale toast
        prevCounts.current[up.id] = counts[up.id] ?? 0;
        continue;
      }
      const prev = prevCounts.current[up.id] ?? 0;
      const curr = counts[up.id] ?? 0;
      if (curr > prev) {
        const label = up.displayName ?? up.platform.name;
        toast({
          title: `New message — ${label}`,
          description: curr === 1 ? "1 unread message" : `${curr} unread messages`,
          duration: 6000,
          action: (
            <ToastAction
              altText="Open platform"
              onClick={() => setLocation(`/dashboard?up=${up.id}`)}
              className="bg-[#dc2350] text-white hover:bg-[#e34f73] border-0"
            >
              Open
            </ToastAction>
          ),
        });
      }
      prevCounts.current[up.id] = curr;
    }
  }, [counts, activeUpId, userPlatforms, toast, setLocation]);

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col bg-[#0a0a0a] relative">
        {userPlatformsLoading && !activeUpId ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
          </div>
        ) : !activeUpId ? (
          <WelcomeScreen />
        ) : null}

        {/* Render ALL visited platforms — only the active one is visible.
            Keeping them mounted means webviews stay alive for title / notification monitoring. */}
        {visitedUpIds.map((upId) => {
          const up = userPlatforms?.find((u) => u.id === upId);
          const state = platformTabs[upId];
          const isActive = upId === activeUpId;

          if (!up || !state) return null;

          return (
            <div
              key={upId}
              className="absolute inset-0 flex flex-col"
              style={{
                visibility: isActive ? "visible" : "hidden",
                pointerEvents: isActive ? "auto" : "none",
                zIndex: isActive ? 1 : 0,
              }}
            >
              {/* Tab bar */}
              <div className="h-11 bg-[#0d0d0d] border-b border-[#1f1f1f] flex items-center pl-3 pr-2 gap-1 shrink-0 overflow-x-auto hide-scrollbar">
                {state.tabs.map((tab, idx) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(upId, tab.id)}
                    className={`group flex items-center gap-2 h-8 pl-3 pr-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                      tab.id === state.activeTabId
                        ? "bg-[#1a1a1a] text-white border border-[#2a2a2a]"
                        : "text-gray-400 hover:text-white hover:bg-[#151515]"
                    }`}
                  >
                    <span>
                      {up.displayName ?? up.platform.name}
                      <span className="text-gray-500"> · Tab {idx + 1}</span>
                    </span>
                    {state.tabs.length > 1 && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(upId, tab.id);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-700 opacity-60 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => addTab(upId)}
                  className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#151515] rounded-md shrink-0"
                  title="Open another tab (new isolated session in the desktop app)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-[#151515] h-8 shrink-0"
                  onClick={() => window.open(up.platform.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  New window
                </Button>
              </div>

              {/* Platform panes — one per tab, all kept mounted via visibility (display:none would detach webviews) */}
              <div className="flex-1 relative">
                {state.tabs.map((tab, idx) => (
                  <div
                    key={tab.id}
                    className="absolute inset-0"
                    style={{
                      visibility: tab.id === state.activeTabId ? "visible" : "hidden",
                      pointerEvents: tab.id === state.activeTabId ? "auto" : "none",
                      zIndex: tab.id === state.activeTabId ? 1 : 0,
                    }}
                  >
                    <PlatformPane
                      platform={up.platform}
                      upId={upId}
                      tabId={tab.id}
                      tabLabel={`Tab ${idx + 1}`}
                      active={isActive && tab.id === state.activeTabId}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

function WelcomeScreen() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-4">
      <img src={logoRoundPng} alt="KoaMessenger" className="w-40 h-40 mb-6 opacity-90" />
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to KoaMessenger</h2>
      <p className="text-gray-400 max-w-md mb-8">
        Your privacy-first communication hub. Select a platform from the sidebar or add a new one to get started.
      </p>
    </div>
  );
}

type PlatformMeta = {
  id: number;
  name: string;
  url: string;
  color: string;
  iconUrl?: string | null;
  embedsInIframe?: boolean;
  iframeNotes?: string | null;
};

function PlatformPane({
  platform,
  upId,
  tabId,
  tabLabel,
  active,
}: {
  platform: PlatformMeta;
  upId: number;
  tabId: string;
  tabLabel?: string;
  active: boolean;
}) {
  const desktop = isDesktop();
  const { setCount, clearCount } = useNotifications();
  const notifyMeta = { name: platform.name, tabLabel };
  const blocked = !desktop && platform.embedsInIframe === false;
  const isNativeOnly = platform.url.includes("apple.com/messages");
  const [loading, setLoading] = useState(!blocked && !isNativeOnly);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webviewRef = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Attach webview event listeners once, when the element is available
  const attachWebviewListeners = useCallback(
    (el: HTMLElement) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wv = el as any;

      const syncTitle = async () => {
        try {
          // executeJavaScript gives us the live title even without a title-changed event
          const title: string = await wv.executeJavaScript("document.title");
          const count = parseUnreadFromTitle(title);
          setCount(upId, tabId, count, notifyMeta);
        } catch {
          // webview not ready yet — ignore
        }
      };

      const onFinish = () => {
        setLoading(false);
        setTimedOut(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        syncTitle();
      };
      const onFail = (e: Event) => {
        const err = e as unknown as { errorCode?: number };
        if (err.errorCode === -3) return; // aborted (normal on redirect)
        setLoading(false);
        setTimedOut(true);
      };
      const onTitleUpdate = (e: Event) => {
        const title = (e as unknown as { title: string }).title ?? "";
        const count = parseUnreadFromTitle(title);
        setCount(upId, tabId, count, notifyMeta);
      };

      el.addEventListener("did-finish-load", onFinish);
      el.addEventListener("did-fail-load", onFail as EventListener);
      el.addEventListener("page-title-updated", onTitleUpdate as EventListener);

      return () => {
        el.removeEventListener("did-finish-load", onFinish);
        el.removeEventListener("did-fail-load", onFail as EventListener);
        el.removeEventListener("page-title-updated", onTitleUpdate as EventListener);
      };
    },
    [upId, tabId, setCount],
  );

  // Callback ref — fires when the webview DOM element is first attached
  const webviewCallbackRef = useCallback(
    (el: HTMLElement | null) => {
      webviewRef.current = el;
      if (!el || !desktop || blocked) return;
      attachWebviewListeners(el);
    },
    [desktop, blocked, attachWebviewListeners],
  );

  // Clear badge when this pane becomes active
  useEffect(() => {
    if (active) clearCount(upId);
  }, [active, upId, clearCount]);

  // Load-timeout for browser iframes
  useEffect(() => {
    if (desktop || blocked) return;
    setLoading(true);
    setTimedOut(false);
    timerRef.current = setTimeout(() => setTimedOut(true), 15000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tabId, desktop, blocked]);

  if (blocked) {
    return <BlockedFallback platform={platform} />;
  }

  if (isNativeOnly) {
    return <NativeOnlyFallback platform={platform} />;
  }

  return (
    <div className="w-full h-full relative">
      {loading && !timedOut && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-10">
          <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
        </div>
      )}
      {timedOut && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2 text-sm text-gray-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          Taking a while — the site may be slow or have limited connectivity.
        </div>
      )}
      {desktop ? (
        <webview
          ref={webviewCallbackRef as unknown as React.RefCallback<HTMLElement>}
          src={platform.url}
          partition={`persist:koa-up-${upId}-tab-${tabId}`}
          allowpopups={"true" as unknown as boolean}
          useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
          style={{ width: "100%", height: "100%", display: "flex" }}
        />
      ) : (
        <iframe
          ref={iframeRef}
          src={platform.url}
          title={`${platform.name} (${tabId})`}
          name={`km-${upId}-${tabId}`}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-storage-access-by-user-activation"
          allow="clipboard-read; clipboard-write; encrypted-media; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setLoading(false);
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
        />
      )}
    </div>
  );
}

function NativeOnlyFallback({ platform }: { platform: PlatformMeta }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6">
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: platform.color || "#333" }}
          >
            {platform.name[0]}
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{platform.name} is native-only</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          {platform.iframeNotes ??
            `${platform.name} does not offer a web or desktop client. It is only available on Apple devices (iPhone, iPad, and Mac) through the native Messages app.`}
        </p>
        <p className="text-gray-500 text-xs mt-4">
          You can keep this in your sidebar as a reminder, or remove it from Add Platforms.
        </p>
      </div>
    </div>
  );
}

function BlockedFallback({ platform }: { platform: PlatformMeta }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6">
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: platform.color || "#333" }}
          >
            {platform.name[0]}
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{platform.name} can't be embedded</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          {platform.iframeNotes ??
            `${platform.name} prevents embedding inside other sites for security. You can still launch it in a new browser tab — your login stays with ${platform.name}, never with us.`}
        </p>
        <Button
          className="bg-[#dc2350] hover:bg-[#e34f73] text-white"
          onClick={() => window.open(platform.url, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open {platform.name}
        </Button>
      </div>
    </div>
  );
}
