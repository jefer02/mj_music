import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface NotificationState {
  toasts: Toast[];
  notify: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

const NotificationContext = createContext<NotificationState | null>(null);

let toastCounter = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info"): void => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev.slice(-4), { id, message, tone }]);

      const timer = window.setTimeout(() => {
        dismiss(id);
      }, 3500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const value = useMemo<NotificationState>(
    () => ({ toasts, notify, dismiss }),
    [toasts, notify, dismiss],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within <NotificationProvider>");
  return ctx;
}
