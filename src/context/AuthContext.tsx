import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/authApi";
import { getToken, clearToken, ApiError } from "../api/apiClient";
import type { LoginRequest, RegisterRequest } from "../types/api";

const GUEST_KEY = "mjmusic_guest";

interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getToken() !== null || localStorage.getItem(GUEST_KEY) === "1";
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return getToken() === null && localStorage.getItem(GUEST_KEY) === "1";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasToken = getToken() !== null;
    const hasGuest = localStorage.getItem(GUEST_KEY) === "1";
    setIsAuthenticated(hasToken || hasGuest);
    setIsGuest(!hasToken && hasGuest);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.login(credentials);
      localStorage.removeItem(GUEST_KEY);
      setIsGuest(false);
      setIsAuthenticated(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? "Invalid username or password"
            : `Login failed (${err.status})`
          : "Network error — check your connection";
      setError(message);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.register(data);
      localStorage.removeItem(GUEST_KEY);
      setIsGuest(false);
      setIsAuthenticated(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Username is already taken"
            : err.status === 400
            ? "Invalid registration data"
            : `Registration failed (${err.status})`
          : "Network error — check your connection";
      setError(message);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback((): void => {
    localStorage.setItem(GUEST_KEY, "1");
    setIsGuest(true);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    authApi.logout();
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isAuthenticated, isGuest, isLoading, error, clearError, login, register, loginAsGuest, logout }),
    [isAuthenticated, isGuest, isLoading, error, clearError, login, register, loginAsGuest, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
