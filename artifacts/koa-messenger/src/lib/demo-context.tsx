import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setDemoToken } from "@workspace/api-client-react";

const DEMO_TOKEN = "demo";
const STORAGE_KEY = "koa-demo-mode";

type DemoUser = {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  emailAddresses: { emailAddress: string }[];
};

const DEMO_USER: DemoUser = {
  id: "demo_user",
  firstName: "Demo",
  lastName: "User",
  imageUrl: "",
  emailAddresses: [{ emailAddress: "demo@koamessenger.app" }],
};

type DemoContextType = {
  isDemo: boolean;
  user: DemoUser | null;
  activate: () => Promise<void>;
  deactivate: () => void;
};

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  user: null,
  activate: async () => {},
  deactivate: () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isDemo, setIsDemo] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    setDemoToken(isDemo ? DEMO_TOKEN : null);
  }, [isDemo]);

  const activate = useCallback(async () => {
    const res = await fetch("/api/demo/setup", {
      method: "POST",
      headers: { "x-demo-token": DEMO_TOKEN },
    });
    if (!res.ok) throw new Error("Demo setup failed");
    sessionStorage.setItem(STORAGE_KEY, "1");
    setDemoToken(DEMO_TOKEN);
    setIsDemo(true);
    queryClient.clear();
  }, [queryClient]);

  const deactivate = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setDemoToken(null);
    setIsDemo(false);
    queryClient.clear();
  }, [queryClient]);

  const user = isDemo ? DEMO_USER : null;

  return (
    <DemoContext.Provider value={{ isDemo, user, activate, deactivate }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
