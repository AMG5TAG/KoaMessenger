import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useListUserPlatforms, useGetMe } from "@workspace/api-client-react";
import { Loader2, ExternalLink, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDesktop, isPlatformAvailable } from "@/lib/desktop";
import {
  useNotifications,
  parseUnreadFromTitle,
  useDesktopNotificationClick,
} from "@/lib/notifications-context";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/* ─────────────────────────────────────────────────────────────────────────
 * Persistent platform panes.
 *
 * This layer is mounted ONCE at the app level (see App.tsx) and never
 * unmounts while the user is signed in. Platform iframes/webviews therefore
 * stay alive across ALL navigation — Settings, Feedback, Add Platforms —
 * not just while the dashboard route is active. Previously this state lived
 * inside the Dashboard page component, so leaving the dashboard destroyed
 * every pane and they all reloaded on return.
 *
 * The layer is a fixed overlay aligned with the content area (right of the
 * sidebar on desktop, below the header on mobile). Panes are hidden with
 * `visibility: hidden` — never display:none or unmounting, both of which
 * detach webviews — whenever their platform isn't the one being viewed or
 * the current route isn't /dashboard.
 * ───────────────────────────────────────────────────────────────────────── */

type Tab = { id: string; createdAt: number };

const TAB_STORAGE_KEY = "km_platform_tabs_v4";
// Last-known value of the server-side `syncAccounts` flag. The webview partition
// string is derived from it, so if a launch can't reach /api/users/me we must
// fall back to this rather than a hardcoded default — otherwise the partition
// flips and every embedded account looks signed out.
const SYNC_PREF_KEY = "km_sync_accounts_v1";

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

/**
 * Persist the tab list for a platform so tabs (and therefore their session
 * partitions / logins) survive an app restart. loadTabsForUp() reads this back;
 * without a writer it always fell through to a single default tab and any
 * additional account tab was orphaned on the next launch.
 */
function saveTabsForUp(upId: number, tabs: Tab[]) {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, Tab[]>) : {};
    data[String(upId)] = tabs;
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable / quota — non-fatal, tabs just won't persist
  }
}

function readSyncPref(): boolean {
  try {
    // default true (matches the server default) when nothing stored yet
    return localStorage.getItem(SYNC_PREF_KEY) !== "false";
  } catch {
    return true;
  }
}

type PlatformTabState = {
  tabs: Tab[];
  activeTabId: string;
};

export function PlatformPanesLayer() {
  const { isSignedIn } = useUser();
  // Unmount everything on sign-out so no sessions linger for the next user.
  if (!isSignedIn) return null;
  return <PanesHost />;
}

function PanesHost() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { counts, pruneCounts } = useNotifications();
  const prevCounts = useRef<Record<number, number>>({});

  const isDashboard = location === "/dashboard";
  const activeUpId = isDashboard
    ? Number(new URLSearchParams(search).get("up") ?? "0") || null
    : null;

  const { data: userPlatforms } = useListUserPlatforms({
    query: { queryKey: ["/api/user-platforms"] },
  });
  // Platforms that can't be embedded in the browser are desktop-only — don't
  // mount, warm, or render panes for them on the web build (see
  // isPlatformAvailable). On desktop this is the full list unchanged.
  const visibleUserPlatforms = userPlatforms?.filter((up) =>
    isPlatformAvailable(up.platform),
  );
  const { data: me, isLoading: meLoading, isError: meError } = useGetMe({
    query: { queryKey: ["/api/users/me"] },
  });
  // Derive syncOn from the server value when we have it, otherwise fall back to
  // the last-known persisted value (NOT a hardcoded default) so an offline
  // launch doesn't flip the partition and sign every account out.
  const syncOn = me ? me.syncAccounts !== false : readSyncPref();

  // Remember the server's syncAccounts whenever we get a fresh value.
  useEffect(() => {
    if (me && typeof me.syncAccounts === "boolean") {
      try {
        localStorage.setItem(SYNC_PREF_KEY, String(me.syncAccounts));
      } catch {
        // non-fatal
      }
    }
  }, [me]);

  // Navigate to platform when user clicks a native macOS notification banner
  useDesktopNotificationClick((upId) => setLocation(`/dashboard?up=${upId}`));

  // ── Sticky platforms: once mounted, never unmount ─────────────────────────
  const [visitedUpIds, setVisitedUpIds] = useState<number[]>([]);
  const [platformTabs, setPlatformTabs] = useState<Record<number, PlatformTabState>>({});

  // Mount a platform's panes (kept hidden until it's the active one). Updates
  // visitedUpIds and platformTabs together so React batches them into a SINGLE
  // render — splitting them would render null in between (visitedUpIds has the
  // platform but platformTabs doesn't yet), detaching and reloading the webview.
  const ensurePaneMounted = useCallback((upId: number) => {
    setVisitedUpIds((prev) => (prev.includes(upId) ? prev : [...prev, upId]));
    setPlatformTabs((prev) => {
      if (prev[upId]) return prev; // already initialised
      const tabs = loadTabsForUp(upId);
      return { ...prev, [upId]: { tabs, activeTabId: tabs[0]?.id ?? "" } };
    });
  }, []);

  // Mount the active platform immediately when navigated to (covers a click that
  // beats the staggered preload below, and platforms added during the session).
  useEffect(() => {
    if (activeUpId) ensurePaneMounted(activeUpId);
  }, [activeUpId, ensurePaneMounted]);

  // Preload ALL connected accounts on launch so they're already loaded — and
  // monitored for unread counts — by the time the user clicks one. Mounting is
  // staggered rather than all-at-once: spawning every webview simultaneously on
  // macOS can starve the GPU/renderer and trigger the black-webview / crash
  // failure modes the panes guard against further down. Each account is
  // scheduled once; refetches of userPlatforms won't re-warm already-scheduled
  // ones, and newly added accounts get warmed too.
  const scheduledPreloadRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!visibleUserPlatforms) return;
    let order = 0;
    for (const up of visibleUserPlatforms) {
      if (scheduledPreloadRef.current.has(up.id)) continue;
      scheduledPreloadRef.current.add(up.id);
      setTimeout(() => ensurePaneMounted(up.id), order++ * 500);
    }
  }, [visibleUserPlatforms, ensurePaneMounted]);

  // Persist tab lists whenever they change so each tab's session partition
  // (and the account logged in there) is re-attached on the next launch.
  useEffect(() => {
    for (const [upId, state] of Object.entries(platformTabs)) {
      saveTabsForUp(Number(upId), state.tabs);
    }
  }, [platformTabs]);

  // Drop notification state for platforms the user has removed — otherwise their
  // unread counts keep inflating the dock badge and lastNotified entries leak.
  useEffect(() => {
    if (!userPlatforms) return;
    pruneCounts(userPlatforms.map((u) => u.id));
  }, [userPlatforms, pruneCounts]);

  // ── Toast when an INACTIVE platform gets a new message ───────────────────
  // Browser-only: on desktop, maybeSendNativeNotification already raises a
  // native OS banner for the same count increase, so also firing this in-app
  // toast produced TWO popups for one message (native top-right + toast
  // bottom-right). The native banner is the desktop path; this toast is the
  // fallback for the web build, which has no OS notifier.
  useEffect(() => {
    if (!visibleUserPlatforms || isDesktop()) return;
    for (const up of visibleUserPlatforms) {
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
  }, [counts, activeUpId, visibleUserPlatforms, toast, setLocation]);

  // Wait for the user record before mounting any pane: syncAccounts is part of
  // the desktop webview partition string, and flipping it after mount would
  // change the partition and force a reload of every webview. If the fetch
  // FAILED (offline), don't block the UI forever — fall through using the
  // persisted syncAccounts value from readSyncPref().
  if (meLoading && !meError) return null;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 top-16 md:left-20 md:top-0 z-30"
      style={{
        pointerEvents: "none",
        // When NOT on the dashboard, push the whole pane layer off-screen so its
        // webviews stop overlapping (and swallowing clicks meant for) the page
        // underneath — Add Platforms / Settings / Feedback / Home. The panes stay
        // MOUNTED so preloaded sessions and unread-count monitoring keep running.
        //
        // This MUST use a layout property (`left`), NOT a CSS `transform`.
        // Electron <webview> guest content renders in a native compositor surface
        // whose geometry tracks the element's LAYOUT box but ignores ancestor
        // transforms — so the previous translateX(-200vw) moved the DOM box
        // visually yet left the native surface (and its mouse-event capture)
        // sitting over the content area, re-breaking those buttons on macOS.
        // (display:none/unmount would also free the clicks but detaches and
        // reloads every webview, defeating the preload.)
        ...(isDashboard
          ? null
          : { left: "-200vw", right: "auto", width: "100vw" }),
      }}
    >
      {/* Render ALL visited platforms — only the active one is visible.
          Keeping them mounted means webviews stay alive for title / notification monitoring. */}
      {visitedUpIds.map((upId) => {
        const up = visibleUserPlatforms?.find((u) => u.id === upId);
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
                    syncOn={syncOn}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
  syncOn,
}: {
  platform: PlatformMeta;
  upId: number;
  tabId: string;
  tabLabel?: string;
  active: boolean;
  syncOn: boolean;
}) {
  const desktop = isDesktop();
  const { setCount, clearCount } = useNotifications();
  const notifyMeta = { name: platform.name, tabLabel };
  // Webview listeners are attached once (the callback below is memoized), so the
  // `active` prop would otherwise be captured stale inside them. Read it through
  // a ref so title syncs always see whether this pane is currently in view.
  const activeRef = useRef(active);
  activeRef.current = active;
  const blocked = !desktop && platform.embedsInIframe === false;
  const isNativeOnly = platform.url.includes("apple.com/messages");
  const [loading, setLoading] = useState(!blocked && !isNativeOnly);
  const [timedOut, setTimedOut] = useState(false);
  const [crashed, setCrashed] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webviewRef = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const reloadPane = useCallback(() => {
    setCrashed(null);
    setLoading(true);
    setTimedOut(false);
    setReloadKey((k) => k + 1);
  }, []);

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
          setCount(upId, tabId, count, notifyMeta, activeRef.current);
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
      // dom-ready fires MUCH earlier than did-finish-load (as soon as the
      // page's DOM is parsed, before subresources). If did-finish-load is
      // for some reason never firing on a slow platform, this still hides
      // the loading overlay so the user sees the actual page.
      const onDomReady = () => {
        setLoading(false);
        setTimedOut(false);
        if (timerRef.current) clearTimeout(timerRef.current);
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
        setCount(upId, tabId, count, notifyMeta, activeRef.current);
      };
      // When the webview's render process crashes (the #1 cause of a black
      // webview area on macOS — happens with heavy SPAs, OOM, GPU issues),
      // surface a recovery UI instead of leaving the user staring at a void.
      const onRenderGone = (e: Event) => {
        const reason =
          (e as unknown as { reason?: string; details?: { reason?: string } })
            .details?.reason ??
          (e as unknown as { reason?: string }).reason ??
          "crashed";
        setLoading(false);
        setCrashed(reason);
      };
      const onUnresponsive = () => {
        // Don't show a full error, but make sure the spinner clears so the user
        // sees the unresponsive page (might still recover).
        setLoading(false);
      };
      // Facebook Messenger: signing in routes through facebook.com, and after
      // the first login Facebook often strands the user on its own home feed
      // instead of returning to messenger.com. When this pane is a Messenger
      // pane and the webview lands on the Facebook home page (NOT a login /
      // checkpoint / 2FA page — those must be left alone mid-flow), send it
      // back to Messenger.
      const platformHost = (() => {
        try {
          return new URL(platform.url).hostname;
        } catch {
          return "";
        }
      })();
      const onDidNavigate = (e: Event) => {
        if (!platformHost.endsWith("messenger.com")) return;
        const navUrl = (e as unknown as { url?: string }).url ?? "";
        let target: URL;
        try {
          target = new URL(navUrl);
        } catch {
          return;
        }
        if (!/(^|\.)facebook\.com$/i.test(target.hostname)) return;
        const isHomeFeed =
          target.pathname === "/" || target.pathname === "/home.php";
        if (!isHomeFeed) return;
        try {
          wv.loadURL?.(platform.url)?.catch?.(() => {});
        } catch {
          // webview not ready — ignore
        }
      };

      el.addEventListener("dom-ready", onDomReady);
      el.addEventListener("did-finish-load", onFinish);
      el.addEventListener("did-fail-load", onFail as EventListener);
      el.addEventListener("page-title-updated", onTitleUpdate as EventListener);
      el.addEventListener("render-process-gone", onRenderGone as EventListener);
      el.addEventListener("crashed", onRenderGone as EventListener);
      el.addEventListener("unresponsive", onUnresponsive);
      el.addEventListener("did-navigate", onDidNavigate as EventListener);

      return () => {
        el.removeEventListener("dom-ready", onDomReady);
        el.removeEventListener("did-finish-load", onFinish);
        el.removeEventListener("did-fail-load", onFail as EventListener);
        el.removeEventListener("page-title-updated", onTitleUpdate as EventListener);
        el.removeEventListener("render-process-gone", onRenderGone as EventListener);
        el.removeEventListener("crashed", onRenderGone as EventListener);
        el.removeEventListener("unresponsive", onUnresponsive);
        el.removeEventListener("did-navigate", onDidNavigate as EventListener);
      };
    },
    [upId, tabId, setCount, platform.url],
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
      {/* Loading spinner — only shown for browser iframes (desktop webviews have native loading chrome) */}
      {!desktop && loading && !timedOut && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Loader2 className="w-8 h-8 text-[#dc2350] animate-spin" />
        </div>
      )}
      {timedOut && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-sm text-muted-foreground">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          Taking a while — the site may be slow or have limited connectivity.
        </div>
      )}
      {crashed && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background p-6">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-card border border-border flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{platform.name} stopped responding</h3>
            <p className="text-muted-foreground text-sm mb-5">
              The page crashed ({crashed}). Your login is still saved — just reload to continue.
            </p>
            <Button onClick={reloadPane} className="bg-[#dc2350] hover:bg-[#e34f73] text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload {platform.name}
            </Button>
          </div>
        </div>
      )}
      {desktop ? (
        // RESTORED to the exact known-working configuration from commit e4f89a8.
        // DO NOT change `display: flex`, the `key`, the `useragent`, or the
        // `style` props without first confirming the app still works end-to-end
        // on a packaged macOS build. Every previous attempt to "improve" this
        // markup caused a regression where the webview rendered pitch black.
        // The black area is NOT a CSS issue — it's the parent's #0a0a0a
        // showing through when something stops the webview from attaching.
        <webview
          ref={webviewCallbackRef as unknown as React.RefCallback<HTMLElement>}
          src={platform.url}
          partition={`persist:koa-up${syncOn ? "" : "-desktop"}-${upId}-tab-${tabId}`}
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
    <div className="h-full w-full flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6">
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: platform.color || "#333" }}
          >
            {platform.name[0]}
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{platform.name} is native-only</h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {platform.iframeNotes ??
            `${platform.name} does not offer a web or desktop client. It is only available on Apple devices (iPhone, iPad, and Mac) through the native Messages app.`}
        </p>
        <p className="text-muted-foreground text-xs mt-4">
          You can keep this in your sidebar as a reminder, or remove it from Add Platforms.
        </p>
      </div>
    </div>
  );
}

function BlockedFallback({ platform }: { platform: PlatformMeta }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6">
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: platform.color || "#333" }}
          >
            {platform.name[0]}
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{platform.name} can't be embedded</h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
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
