import { useEffect, useState, type FormEvent } from "react";
import { Music, Lock, User, Eye, EyeOff, Mail, UserPlus, LogIn, Ghost } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

type AuthMode = "login" | "register";

export function LoginModal() {
  const { login, register, loginAsGuest, isLoading, error, clearError } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  // Clear errors when switching modes or changing fields
  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLocalError(null);
    clearError();
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password) return;

    if (mode === "register") {
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }
      await register({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
      });
    } else {
      await login({ username: username.trim(), password });
    }
  };

  const displayError = localError ?? error;
  const isRegister = mode === "register";

  return (
    <div className={`login-backdrop ${mounted ? "is-visible" : ""}`}>
      <div className="login-panel">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Music size={28} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="login-brand-name">MJ Music</h1>
            <p className="login-brand-sub">Local + YouTube Player</p>
          </div>
        </div>

        {/* Mode toggle tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? "is-active" : ""}`}
            onClick={() => switchMode("login")}
          >
            <LogIn size={14} />
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? "is-active" : ""}`}
            onClick={() => switchMode("register")}
          >
            <UserPlus size={14} />
            Create account
          </button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={(e) => void handleSubmit(e)} noValidate>

          {/* Username */}
          <div className="login-field">
            <label htmlFor="auth-username" className="login-label">Username</label>
            <div className="login-input-wrap">
              <User size={16} className="login-input-icon" />
              <input
                id="auth-username"
                type="text"
                className="login-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Email — only on register */}
          {isRegister && (
            <div className="login-field">
              <label htmlFor="auth-email" className="login-label">
                Email <span style={{ fontWeight: 400, color: "#4a5568" }}>(optional)</span>
              </label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className="login-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="login-field">
            <label htmlFor="auth-password" className="login-label">Password</label>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                className="login-input login-input--with-action"
                placeholder={isRegister ? "Min. 6 characters" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password — only on register */}
          {isRegister && (
            <div className="login-field">
              <label htmlFor="auth-confirm" className="login-label">Confirm password</label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  id="auth-confirm"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          )}

          {/* Error */}
          {displayError && (
            <div className="login-error" role="alert">
              {displayError}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={
              isLoading ||
              !username.trim() ||
              !password ||
              (isRegister && !confirmPassword)
            }
          >
            {isLoading ? (
              <><Spinner size="sm" /> {isRegister ? "Creating account…" : "Signing in…"}</>
            ) : isRegister ? (
              <><UserPlus size={16} /> Create account</>
            ) : (
              <><LogIn size={16} /> Sign in</>
            )}
          </Button>
        </form>

        {/* Guest divider */}
        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Guest access */}
        <button
          type="button"
          className="guest-btn"
          onClick={loginAsGuest}
          disabled={isLoading}
        >
          <Ghost size={16} />
          Continue without account
        </button>

        {/* Footer switch link */}
        <p className="login-footer">
          {isRegister ? (
            <>Already have an account?{" "}
              <button type="button" className="login-link" onClick={() => switchMode("login")}>
                Sign in
              </button>
            </>
          ) : (
            <>No account yet?{" "}
              <button type="button" className="login-link" onClick={() => switchMode("register")}>
                Create one
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
