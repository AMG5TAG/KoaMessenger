import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useGetMe } from "@workspace/api-client-react";

export type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: me } = useGetMe({ query: { queryKey: ["/api/users/me"] } });

  const [theme, setThemeState] = useState<Theme>(() => {
    // Hydrate from localStorage immediately to avoid flash
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("km-theme") as Theme | null;
      if (stored) return stored;
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    const t = (typeof window !== "undefined" && (localStorage.getItem("km-theme") as Theme | null)) || "system";
    return t === "system" ? getSystemTheme() : t;
  });

  // Sync with API preference when it loads
  useEffect(() => {
    if (me?.theme && ["light", "dark", "system"].includes(me.theme)) {
      setThemeState(me.theme as Theme);
      localStorage.setItem("km-theme", me.theme);
    }
  }, [me?.theme]);

  // Apply class to <html> and resolve system
  useEffect(() => {
    const root = document.documentElement;
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    if (resolved === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      if (resolved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("km-theme", newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
