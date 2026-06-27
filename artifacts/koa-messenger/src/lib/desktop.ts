declare global {
  interface Window {
    koaDesktop?: {
      isElectron: boolean;
      platform: string;
      version: string;
      /** Send a native OS notification (macOS Notification Center, etc.) */
      sendNotification?: (title: string, body: string, label?: string, upId?: number) => void;
      /** Update the Dock / taskbar badge count */
      setBadgeCount?: (count: number) => void;
      /** Subscribe to notification-click events from the OS */
      onNotificationClick?: (callback: (upId: number) => void) => (() => void) | void;
      /** Clear cookies/localStorage/cache for a single platform partition ("log out") */
      clearPartition?: (partition: string) => Promise<{ ok: boolean; error?: string }>;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
          useragent?: string;
          allowpopups?: boolean | string;
          preload?: string;
          httpreferrer?: string;
          disablewebsecurity?: boolean | string;
          nodeintegration?: boolean | string;
        },
        HTMLElement
      >;
    }
  }
}

export const isDesktop = (): boolean => {
  return typeof window !== "undefined" && window.koaDesktop?.isElectron === true;
};

/**
 * Platforms that block iframe embedding (`embedsInIframe === false`) can only be
 * launched in a throwaway browser tab on the web build — the user logs in there
 * and the session never comes back to KoaMessenger, so they're not actually
 * usable. The desktop apps embed them fine (the Electron shell strips the
 * blocking X-Frame-Options / CSP headers), so these platforms are surfaced ONLY
 * on desktop and hidden from the web build's catalog, sidebar, panes and
 * settings. Returns true when the platform should be shown in the current build.
 */
export const isPlatformAvailable = (
  platform: { embedsInIframe?: boolean | null } | null | undefined,
): boolean => {
  if (!platform) return false;
  return isDesktop() || platform.embedsInIframe !== false;
};

export {};
