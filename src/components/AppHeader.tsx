interface AppHeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-area">
        <img src="/assets/logo-secondary.png" alt="MJ Music logo" className="brand-logo" />
        <div className="brand-copy">
          <h1>MJ Music</h1>
          <p>React Audio Hub · Local + YouTube</p>
        </div>
      </div>

      <button className="btn-theme" type="button" onClick={onToggleTheme}>
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>
    </header>
  );
}
