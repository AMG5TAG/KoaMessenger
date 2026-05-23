declare global {
  interface Window {
    koaDesktop?: {
      isElectron: boolean;
      platform: string;
      version: string;
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
