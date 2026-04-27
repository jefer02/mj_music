import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Music,
} from "lucide-react";
import { HiResBadge } from "./HiResBadge";
import { SourceBadge } from "./SourceBadge";
import { IconButton } from "./ui/IconButton";
import type { PlaybackEngineType } from "../types/player";
import type { Song } from "../types/song";
import { formatSecondsToClock } from "../utils/time";

interface PlayerPanelProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
  activeEngine: PlaybackEngineType;
  onTogglePlayPause: () => void;
  onNextSong: () => void;
  onPreviousSong: () => void;
  onToggleLoop: () => void;
  onToggleShuffle: () => void;
  onSeekTo: (seconds: number) => void;
  onVolumeChange: (value: number) => void;
  youtubeSurface: ReactNode;
}

export function PlayerPanel(props: PlayerPanelProps) {
  const {
    currentSong, isPlaying, currentTime, duration,
    volume, isLoopEnabled, isShuffleEnabled, activeEngine,
    onTogglePlayPause, onNextSong, onPreviousSong,
    onToggleLoop, onToggleShuffle, onSeekTo, onVolumeChange,
    youtubeSurface,
  } = props;

  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [particlePalette, setParticlePalette] = useState<[string, string, string]>([
    "255, 118, 67", "74, 183, 158", "92, 126, 198",
  ]);

  // Extract cover palette
  useEffect(() => {
    let cancelled = false;
    const coverUrl = currentSong?.coverUrl;
    if (!coverUrl) {
      setParticlePalette(["255, 118, 67", "74, 183, 158", "92, 126, 198"]);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const c = document.createElement("canvas");
        c.width = 30; c.height = 30;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 30, 30);
        const px = ctx.getImageData(0, 0, 30, 30).data;
        let tw = 0, ar = 0, ag = 0, ab = 0, bestScore = -1;
        let strongest: [number, number, number] = [255, 118, 67];

        for (let i = 0; i < px.length; i += 4) {
          const r = px[i] ?? 0, g = px[i + 1] ?? 0, b = px[i + 2] ?? 0, a = px[i + 3] ?? 0;
          if (a < 30) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lgt = (max + min) / 510;
          const w = 0.35 + sat * 1.2;
          ar += r * w; ag += g * w; ab += b * w; tw += w;
          const score = sat * 1.8 + (1 - Math.abs(lgt - 0.52));
          if (score > bestScore) { bestScore = score; strongest = [r, g, b]; }
        }

        if (tw <= 0) return;
        const base: [number, number, number] = [Math.round(ar / tw), Math.round(ag / tw), Math.round(ab / tw)];
        const bright: [number, number, number] = [
          Math.min(255, Math.round(strongest[0] * 1.12 + 10)),
          Math.min(255, Math.round(strongest[1] * 1.12 + 10)),
          Math.min(255, Math.round(strongest[2] * 1.12 + 10)),
        ];
        const deep: [number, number, number] = [
          Math.max(20, Math.round(base[0] * 0.64)),
          Math.max(20, Math.round(base[1] * 0.64)),
          Math.max(20, Math.round(base[2] * 0.64)),
        ];
        setParticlePalette([`${base[0]}, ${base[1]}, ${base[2]}`, `${bright[0]}, ${bright[1]}, ${bright[2]}`, `${deep[0]}, ${deep[1]}, ${deep[2]}`]);
      } catch { setParticlePalette(["255, 118, 67", "74, 183, 158", "92, 126, 198"]); }
    };
    img.onerror = () => setParticlePalette(["255, 118, 67", "74, 183, 158", "92, 126, 198"]);
    img.src = coverUrl;
    return () => { cancelled = true; };
  }, [currentSong?.coverUrl]);

  // Particles animation
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement;
    if (!host) return;

    let frame = 0, time = 0;
    const count = Math.min(170, Math.max(74, Math.round(host.clientWidth / 6.1)));
    const colors = particlePalette.map((c) => `rgba(${c}, `);

    interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; as: number; ci: number; }
    const ps: P[] = [];

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(host.clientWidth * dpr);
      canvas.height = Math.round(host.clientHeight * dpr);
      canvas.style.width = `${host.clientWidth}px`;
      canvas.style.height = `${host.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const populate = () => {
      ps.length = 0;
      for (let i = 0; i < count; i++) {
        ps.push({
          x: Math.random() * host.clientWidth, y: Math.random() * host.clientHeight,
          vx: (Math.random() - 0.5) * 0.34, vy: (Math.random() - 0.5) * 0.34,
          r: 1.9 + Math.random() * 3.8, a: 0.34 + Math.random() * 0.45,
          as: 0.004 + Math.random() * 0.01, ci: Math.floor(Math.random() * colors.length),
        });
      }
    };

    resize(); populate();

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, host.clientWidth, host.clientHeight);
      const g = ctx.createRadialGradient(host.clientWidth * 0.5, host.clientHeight * 0.46, 0, host.clientWidth * 0.5, host.clientHeight * 0.46, Math.max(host.clientWidth, host.clientHeight) * 0.72);
      g.addColorStop(0, `rgba(${particlePalette[1]}, 0.48)`);
      g.addColorStop(0.5, `rgba(${particlePalette[0]}, 0.28)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, host.clientWidth, host.clientHeight);

      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.a += p.as;
        if (p.a > 0.84 || p.a < 0.24) p.as *= -1;
        if (p.x < -12) p.x = host.clientWidth + 12;
        if (p.x > host.clientWidth + 12) p.x = -12;
        if (p.y < -12) p.y = host.clientHeight + 12;
        if (p.y > host.clientHeight + 12) p.y = -12;
        const pulse = 1 + Math.sin(time * 1.72 + p.x * 0.01 + p.y * 0.01) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${colors[p.ci]}${Math.max(0.22, p.a)})`;
        ctx.shadowBlur = 14; ctx.shadowColor = `${colors[p.ci]}0.72)`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      frame = window.requestAnimationFrame(animate);
    };

    if (isPlaying && currentSong) {
      frame = window.requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, host.clientWidth, host.clientHeight);
    }

    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); window.cancelAnimationFrame(frame); };
  }, [currentSong, isPlaying, particlePalette]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isMuted = volume === 0;

  return (
    <section className="player-panel" aria-label="Music player">
      <canvas
        ref={particlesCanvasRef}
        className={`player-particles ${isPlaying && currentSong ? "is-active" : ""}`}
        aria-hidden="true"
      />

      <div className="player-main">
        {/* Album cover / YouTube surface */}
        <div className="media-stage">
          <div className={`album-cover ${activeEngine === "YOUTUBE" ? "is-hidden" : ""}`}>
            {currentSong?.coverUrl ? (
              <img src={currentSong.coverUrl} alt={`Cover for ${currentSong.title}`} />
            ) : (
              <div className="cover-fallback">
                <Music size={36} strokeWidth={1.4} />
              </div>
            )}
          </div>
          {youtubeSurface}
        </div>

        {/* Now playing info */}
        <div className="now-playing-block">
          <span className="now-playing-label">Now Playing</span>
          <h2 className="now-playing-title">{currentSong?.title ?? "No song selected"}</h2>
          <p className="now-playing-artist">{currentSong?.artist ?? "—"}</p>

          {currentSong && (
            <div className="now-playing-badges">
              <SourceBadge sourceType={currentSong.sourceType} />
              <span className="hires-slot hires-slot--player">
                <HiResBadge isHiRes={currentSong.isHiRes} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="progress-block">
        <span className="progress-time">{formatSecondsToClock(currentTime)}</span>
        <input
          type="range"
          className="seek-slider"
          min={0} max={100} step={0.1}
          value={Number.isFinite(progress) ? progress : 0}
          onChange={(e) => {
            const pct = Number(e.target.value);
            onSeekTo((Math.max(0, Math.min(100, pct)) / 100) * (duration || 0));
          }}
          aria-label="Playback position"
        />
        <span className="progress-time">{formatSecondsToClock(duration)}</span>
      </div>

      {/* Controls */}
      <div className="control-row">
        <IconButton label={isShuffleEnabled ? "Shuffle on" : "Shuffle off"} isActive={isShuffleEnabled} onClick={onToggleShuffle}>
          <Shuffle size={18} />
        </IconButton>

        <IconButton label="Previous track" onClick={onPreviousSong} size="lg">
          <SkipBack size={20} />
        </IconButton>

        <button
          type="button"
          className="btn-play-main"
          onClick={onTogglePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>

        <IconButton label="Next track" onClick={onNextSong} size="lg">
          <SkipForward size={20} />
        </IconButton>

        <IconButton label={isLoopEnabled ? "Loop on" : "Loop off"} isActive={isLoopEnabled} onClick={onToggleLoop}>
          <Repeat size={18} />
        </IconButton>
      </div>

      {/* Volume */}
      <div className="volume-row">
        <button
          type="button"
          className="volume-icon-btn"
          onClick={() => onVolumeChange(isMuted ? 0.7 : 0)}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          id="volume-range"
          type="range"
          className="volume-slider"
          min={0} max={100} step={1}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          aria-label="Volume"
        />
        <span className="volume-pct">{Math.round(volume * 100)}%</span>
      </div>
    </section>
  );
}
