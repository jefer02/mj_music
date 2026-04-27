import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SourceMode = "LOCAL" | "ONLINE";

interface AppState {
  sourceMode: SourceMode;
  setSourceMode: (mode: SourceMode) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sourceMode, setSourceMode] = useState<SourceMode>("LOCAL");

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("mjmusic_theme");
    return saved === "dark" ? "dark" : "light";
  });

  const toggleTheme = useCallback((): void => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("mjmusic_theme", next);
      document.body.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  // Apply theme to DOM on mount
  useMemo(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const value = useMemo<AppState>(
    () => ({ sourceMode, setSourceMode, theme, toggleTheme }),
    [sourceMode, theme, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
