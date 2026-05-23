import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListUserPlatforms } from "@workspace/api-client-react";
import { Loader2, ExternalLink, X, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDesktop } from "@/lib/desktop";
import { useNotifications, parseUnreadFromTitle } from "@/lib/notifications-context";
import logoRoundPng from "@assets/Logo_-_KoaMessenger_1779504607995.png";

type Tab = { id: string; createdAt: number };

const TAB_STORAGE_KEY = "km_platform_tabs_v2";

function loadTabsForUp(upId: string): Tab[] {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (!raw) return [{ id: `${upId}-1`, createdAt: Date.now() }];
    const data = JSON.parse(raw) as Record<string, Tab[]>;
    return data[upId] && data[upId].length > 0
      ? data[upId]
      : [{ id: `${upId}-1`, createdAt: Date.now() }];
  } catch {
    return [{ id: `${upId}-1`, createdAt: Date.now() }];
  }
}

function saveTabsForUp(upId: string, tabs: Tab[]) {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, Tab[]>) : {};
    data[upId] = tabs;
    sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function Dashboard() {
  const searchParams = new URLSearchParams(window.location.search);
  const upParam = searchParams.get("up");

  const { data: userPlatforms, isLoading: userPlatformsLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] },
  });

  const userPlatform = upParam
    ? userPlatforms?.find(up => up.id === Number(upParam))
    : undefined;

  const platform = userPlatform?.platform;

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    if (!upParam) return;
    const loaded = loadTabsForUp(upParam);
    setTabs(loaded);
    setActiveTabId(loaded[0]?.id ?? null);
  }, [upParam]);

  useEffect(() => {
    if (!upParam || tabs.length === 0) return;
    saveTabsForUp(upParam, tabs);
  }, [upParam, tabs]);

  const addTab = () => {
    if (!upParam) return;
    const newTab: Tab = { id: `${upParam}-${Date.now()}`, createdAt: Date.now() };
    setTabs((t) => [...t, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs((t) => {
      const next = t.filter((x) => x.id !== tabId);
      if (next.length === 0) {
        const fresh: Tab = { id: `${upParam}-${Date.now()}`, createdAt: Date.now() };
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (tabId === activeTabId) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
  };

  if (!upParam) {
    return (
      <AppLayout>
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-4">
          <img src={logoRoundPng} alt="KoaMessenger" className="w-40 h-40 mb-6 opacity-90" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to KoaMessenger</h2>
          <p className="text-gray-400 max-w-md mb-8">
            Your privacy-first communication hub. Select a platform from the sidebar or add a new one to get started.
          </p>
        </div>
      </AppLayout>
    );
  }

  const isLoading = userPlatformsLoading;

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
          </div>
        ) : platform && userPlatform ? (
          <>
            {/* Tab bar */}
            <div className="h-11 bg-[#0d0d0d] border-b border-[#1f1f1f] flex items-center pl-3 pr-2 gap-1 shrink-0 overflow-x-auto hide-scrollbar">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 h-8 pl-3 pr-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                    tab.id === activeTabId
                      ? "bg-[#1a1a1a] text-white border border-[#2a2a2a]"
                      : "text-gray-400 hover:text-white hover:bg-[#151515]"
                  }`}
                  data-testid={`tab-${idx}`}
                >
                  <span>
                    {userPlatform.displayName ?? platform.name}{" "}
                    <span className="text-gray-500">· Tab {idx + 1}</span>
                  </span>
                  {tabs.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-700 opacity-60 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={addTab}
                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#151515] rounded-md shrink-0"
                title="Open another tab (new login session in desktop app)"
                data-testid="button-add-tab"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-[#151515] h-8 shrink-0"
                onClick={() => window.open(platform.url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                New tab
              </Button>
            </div>

            {/* Iframe panes (keep all mounted, only show active so tabs preserve state) */}
            <div className="flex-1 relative">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`absolute inset-0 ${tab.id === activeTabId ? "block" : "hidden"}`}
                >
                  <PlatformPane
                    platform={platform}
                    upId={userPlatform.id}
                    tabId={tab.id}
                    active={tab.id === activeTabId}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-gray-400">Platform not found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function PlatformPane({
  platform,
  upId,
  tabId,
  active,
}: {
  platform: { id: number; name: string; url: string; color: string; iconUrl?: string | null; embedsInIframe?: boolean; iframeNotes?: string | null };
  upId: number;
  tabId: string;
  active: boolean;
}) {
  const desktop = isDesktop();
  const { setCount, clearCount } = useNotifications();
  const blocked = !desktop && platform.embedsInIframe === false;
  const [loading, setLoading] = useState(!blocked);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webviewRef = useRef<HTMLElement | null>(null);

  // Electron webview: listen for load events
  useEffect(() => {
    if (!desktop || blocked) return;
    const el = webviewRef.current;
    if (!el) return;
    const onFinish = () => {
      setLoading(false);
      setTimedOut(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    const onFail = (e: Event) => {
      const err = e as unknown as { errorCode?: number };
      if (err.errorCode === -3) return;
      setLoading(false);
      setTimedOut(true);
    };
    el.addEventListener("did-finish-load", onFinish);
    el.addEventListener("did-fail-load", onFail as EventListener);
    return () => {
      el.removeEventListener("did-finish-load", onFinish);
      el.removeEventListener("did-fail-load", onFail as EventListener);
    };
  }, [desktop, blocked, tabId]);

  // Electron webview: parse unread count from page title
  useEffect(() => {
    if (!desktop || blocked) return;
    const el = webviewRef.current;
    if (!el) return;
    const onTitleUpdate = (e: Event) => {
      const title = (e as unknown as { title: string }).title ?? "";
      const count = parseUnreadFromTitle(title);
      setCount(upId, tabId, count);
    };
    el.addEventListener("page-title-updated", onTitleUpdate as EventListener);
    return () => {
      el.removeEventListener("page-title-updated", onTitleUpdate as EventListener);
    };
  }, [desktop, blocked, upId, tabId, setCount]);

  // Clear count when this pane is focused/active
  useEffect(() => {
    if (active) clearCount(upId);
  }, [active, upId, clearCount]);

  // Load timeout for browser iframes
  useEffect(() => {
    if (blocked) return;
    setLoading(true);
    setTimedOut(false);
    timerRef.current = setTimeout(() => setTimedOut(true), 15000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tabId, blocked]);

  if (blocked) {
    return <BlockedFallback platform={platform} />;
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
          ref={(el) => { webviewRef.current = el; }}
          src={platform.url}
          partition={`persist:plat-${platform.id}-${tabId}`}
          allowpopups={"true" as unknown as boolean}
          useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
          style={{ width: "100%", height: "100%", display: "flex" }}
        />
      ) : (
        <iframe
          ref={iframeRef}
          src={platform.url}
          title={`${platform.name} (${tabId})`}
          name={`km-${tabId}`}
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

function BlockedFallback({
  platform,
}: {
  platform: { name: string; url: string; color: string; iconUrl?: string | null; iframeNotes?: string | null };
}) {
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
