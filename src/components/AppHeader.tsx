import { Moon, Sun, Wifi, HardDrive, LogOut } from "lucide-react";
import mjLogo from "../../assets/MJ.png";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";

interface AppHeaderProps {
  onLogoClick: () => void;
}

export function AppHeader({ onLogoClick }: AppHeaderProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme, sourceMode, setSourceMode } = useApp();

  return (
    <header className="app-header">
      {/* Brand — click reloads */}
      <button
        type="button"
        className="brand-area"
        onClick={onLogoClick}
        aria-label="MJ Music — click to refresh"
      >
        <div className="brand-logo-wrap">
          <img src={mjLogo} alt="MJ Music" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
        </div>
        <div className="brand-copy">
          <h1>MJ Music</h1>
          <p>Local + YouTube Player</p>
        </div>
      </button>

      {/* Right controls */}
      <div className="header-controls">
        {/* Source mode toggle */}
        <div className="mode-toggle" role="group" aria-label="Source mode">
          <button
            type="button"
            className={`mode-toggle-btn ${sourceMode === "LOCAL" ? "is-active" : ""}`}
            onClick={() => setSourceMode("LOCAL")}
            aria-pressed={sourceMode === "LOCAL"}
          >
            <HardDrive size={14} />
            <span>Local</span>
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${sourceMode === "ONLINE" ? "is-active" : ""}`}
            onClick={() => setSourceMode("ONLINE")}
            aria-pressed={sourceMode === "ONLINE"}
          >
            <Wifi size={14} />
            <span>Online</span>
          </button>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          className="btn-theme"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Logout */}
        <button
          type="button"
          className="btn-theme btn-logout"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
