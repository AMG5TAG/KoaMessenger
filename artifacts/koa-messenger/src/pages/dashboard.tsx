import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListUserPlatforms, useGetPlatform } from "@workspace/api-client-react";
import { Loader2, ExternalLink, X, Plus, ShieldAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoRoundPng from "@assets/Logo_-_KoaMessenger_1779504607995.png";

type Tab = { id: string; createdAt: number };

const TAB_STORAGE_KEY = "km_platform_tabs_v1";

function loadTabsForPlatform(platformId: string): Tab[] {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (!raw) return [{ id: `${platformId}-1`, createdAt: Date.now() }];
    const data = JSON.parse(raw) as Record<string, Tab[]>;
    return data[platformId] && data[platformId].length > 0
      ? data[platformId]
      : [{ id: `${platformId}-1`, createdAt: Date.now() }];
  } catch {
    return [{ id: `${platformId}-1`, createdAt: Date.now() }];
  }
}

function saveTabsForPlatform(platformId: string, tabs: Tab[]) {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, Tab[]>) : {};
    data[platformId] = tabs;
    sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function Dashboard() {
  const searchParams = new URLSearchParams(window.location.search);
  const platformId = searchParams.get("platform");

  const { data: userPlatforms, isLoading: userPlatformsLoading } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] },
  });

  const { data: platform, isLoading: platformLoading } = useGetPlatform(
    Number(platformId),
    { query: { enabled: !!platformId, queryKey: [`/api/platforms/${platformId}`] } },
  );

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    if (!platformId) return;
    const loaded = loadTabsForPlatform(platformId);
    setTabs(loaded);
    setActiveTabId(loaded[0]?.id ?? null);
  }, [platformId]);

  useEffect(() => {
    if (!platformId || tabs.length === 0) return;
    saveTabsForPlatform(platformId, tabs);
  }, [platformId, tabs]);

  const addTab = () => {
    if (!platformId) return;
    const newTab: Tab = { id: `${platformId}-${Date.now()}`, createdAt: Date.now() };
    setTabs((t) => [...t, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs((t) => {
      const next = t.filter((x) => x.id !== tabId);
      if (next.length === 0) {
        const fresh: Tab = { id: `${platformId}-${Date.now()}`, createdAt: Date.now() };
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (tabId === activeTabId) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
  };

  if (!platformId) {
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

  const isLoading = platformLoading || userPlatformsLoading;

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
          </div>
        ) : platform ? (
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
                    {platform.name} <span className="text-gray-500">· Tab {idx + 1}</span>
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
                title="Open another tab"
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
  tabId,
  active,
}: {
  platform: { id: number; name: string; url: string; color: string; iconUrl?: string | null; embedsInIframe?: boolean; iframeNotes?: string | null };
  tabId: string;
  active: boolean;
}) {
  const blocked = platform.embedsInIframe === false;
  const [loading, setLoading] = useState(!blocked);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (blocked) return;
    setLoading(true);
    setTimedOut(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (loading) setTimedOut(true);
    }, 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Reset when tab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, blocked]);

  if (blocked) {
    return <BlockedFallback platform={platform} />;
  }

  return (
    <div className="absolute inset-0">
      {loading && !timedOut && (
        <div className="absolute inset-0 z-10 bg-[#0a0a0a] flex flex-col items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin mb-4" />
          <p className="text-gray-400">Loading {platform.name} securely...</p>
        </div>
      )}
      {timedOut && loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-950/80 border border-amber-700/60 text-amber-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm max-w-md">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            {platform.name} is taking longer than usual. It may be blocking embed —{" "}
            <button
              className="underline hover:text-white"
              onClick={() => window.open(platform.url, "_blank", "noopener,noreferrer")}
            >
              open in a new tab
            </button>
            .
          </span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={platform.url}
        title={`${platform.name} (${tabId})`}
        name={`km-${tabId}`}
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-storage-access-by-user-activation"
        allow="clipboard-read; clipboard-write; encrypted-media; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        loading={active ? "eager" : "lazy"}
        onLoad={() => {
          setLoading(false);
          setTimedOut(false);
          if (timerRef.current) clearTimeout(timerRef.current);
        }}
      />
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
      <div className="max-w-lg w-full bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 text-center">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: `${platform.color}20`, border: `1px solid ${platform.color}40` }}
        >
          <ShieldAlert className="w-8 h-8" style={{ color: platform.color }} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{platform.name} can't be embedded</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          {platform.iframeNotes ??
            `${platform.name} prevents embedding inside other sites for security. You can still launch it in a new browser tab — your login stays with ${platform.name}, never with us.`}
        </p>
        <Button
          className="bg-[#dc2350] hover:bg-[#e34f73] text-white h-11 px-6 rounded-xl"
          onClick={() => window.open(platform.url, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open {platform.name}
        </Button>
        <p className="text-xs text-gray-600 mt-5">
          Tip: a desktop app build (Electron) could embed {platform.name} directly. Ask if you'd like one.
        </p>
      </div>
    </div>
  );
}
