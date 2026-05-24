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

export {};
