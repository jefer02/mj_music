import { useEffect, useState } from "react";
import { Music } from "lucide-react";

interface LoadingScreenProps {
  stage?: "auth" | "library" | "playlists" | "settings" | "ready";
}

const STAGE_MESSAGES: Record<NonNullable<LoadingScreenProps["stage"]>, string> = {
  auth: "Verifying credentials…",
  library: "Loading your library…",
  playlists: "Fetching playlists…",
  settings: "Restoring settings…",
  ready: "Almost there…",
};

const STAGE_PROGRESS: Record<NonNullable<LoadingScreenProps["stage"]>, number> = {
  auth: 15,
  library: 40,
  playlists: 65,
  settings: 85,
  ready: 100,
};

export function LoadingScreen({ stage = "library" }: LoadingScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  const progress = STAGE_PROGRESS[stage];
  const message = STAGE_MESSAGES[stage];

  return (
    <div className={`loading-screen ${visible ? "is-visible" : ""}`}>
      <div className="loading-content">
        {/* Animated logo */}
        <div className="loading-logo">
          <div className="loading-logo-ring" />
          <div className="loading-logo-ring loading-logo-ring--2" />
          <Music size={28} strokeWidth={1.6} className="loading-logo-icon" />
        </div>

        <div className="loading-text-block">
          <h1 className="loading-app-name">MJ Music</h1>
          <p className="loading-stage-msg">{message}</p>
        </div>

        {/* Progress bar */}
        <div className="loading-bar-track">
          <div
            className="loading-bar-fill"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  );
}
