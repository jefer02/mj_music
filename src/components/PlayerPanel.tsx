import { useEffect, useRef, useState, type ReactNode } from "react";
import { HiResBadge } from "./HiResBadge";
import { SourceBadge } from "./SourceBadge";
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
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoopEnabled,
    isShuffleEnabled,
    activeEngine,
    onTogglePlayPause,
    onNextSong,
    onPreviousSong,
    onToggleLoop,
    onToggleShuffle,
    onSeekTo,
    onVolumeChange,
    youtubeSurface,
  } = props;

  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [particlePalette, setParticlePalette] = useState<[string, string, string]>([
    "255, 118, 67",
    "74, 183, 158",
    "92, 126, 198",
  ]);

  useEffect(() => {
    let isCancelled = false;
    const coverUrl = currentSong?.coverDataUrl;

    if (!coverUrl) {
      setParticlePalette(["255, 118, 67", "74, 183, 158", "92, 126, 198"]);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (isCancelled) {
        return;
      }

      try {
        const sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = 30;
        sampleCanvas.height = 30;
        const sampleContext = sampleCanvas.getContext("2d");

        if (!sampleContext) {
          return;
        }

        sampleContext.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const pixels = sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;

        let totalWeight = 0;
        let avgRed = 0;
        let avgGreen = 0;
        let avgBlue = 0;

        let strongestScore = -1;
        let strongest: [number, number, number] = [255, 118, 67];

        for (let i = 0; i < pixels.length; i += 4) {
          const red = pixels[i] ?? 0;
          const green = pixels[i + 1] ?? 0;
          const blue = pixels[i + 2] ?? 0;
          const alpha = pixels[i + 3] ?? 0;

          if (alpha < 30) {
            continue;
          }

          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const lightness = (max + min) / 510;
          const weight = 0.35 + saturation * 1.2;

          avgRed += red * weight;
          avgGreen += green * weight;
          avgBlue += blue * weight;
          totalWeight += weight;

          const score = saturation * 1.8 + (1 - Math.abs(lightness - 0.52));
          if (score > strongestScore) {
            strongestScore = score;
            strongest = [red, green, blue];
          }
        }

        if (totalWeight <= 0) {
          return;
        }

        const base: [number, number, number] = [
          Math.round(avgRed / totalWeight),
          Math.round(avgGreen / totalWeight),
          Math.round(avgBlue / totalWeight),
        ];

        const brighter: [number, number, number] = [
          Math.min(255, Math.round(strongest[0] * 1.12 + 10)),
          Math.min(255, Math.round(strongest[1] * 1.12 + 10)),
          Math.min(255, Math.round(strongest[2] * 1.12 + 10)),
        ];

        const deeper: [number, number, number] = [
          Math.max(20, Math.round(base[0] * 0.64)),
          Math.max(20, Math.round(base[1] * 0.64)),
          Math.max(20, Math.round(base[2] * 0.64)),
        ];

        setParticlePalette([
          `${base[0]}, ${base[1]}, ${base[2]}`,
          `${brighter[0]}, ${brighter[1]}, ${brighter[2]}`,
          `${deeper[0]}, ${deeper[1]}, ${deeper[2]}`,
        ]);
      } catch {
        setParticlePalette(["255, 118, 67", "74, 183, 158", "92, 126, 198"]);
      }
    };

    image.src = coverUrl;

    return () => {
      isCancelled = true;
    };
  }, [currentSong?.coverDataUrl]);

  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let animationFrame = 0;
    let time = 0;

    const host = canvas.parentElement;
    if (!host) {
      return;
    }

    const particlesCount = Math.min(110, Math.max(42, Math.round(host.clientWidth / 8.5)));
    const colors = particlePalette.map((color) => `rgba(${color}, `);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      alphaSpeed: number;
      colorIndex: number;
    }

    const particles: Particle[] = [];

    const resizeCanvas = (): void => {
      const nextWidth = host.clientWidth;
      const nextHeight = host.clientHeight;
      if (nextWidth <= 0 || nextHeight <= 0) {
        return;
      }

      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(nextWidth * pixelRatio);
      canvas.height = Math.round(nextHeight * pixelRatio);
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const populateParticles = (): void => {
      particles.length = 0;

      for (let index = 0; index < particlesCount; index += 1) {
        particles.push({
          x: Math.random() * host.clientWidth,
          y: Math.random() * host.clientHeight,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          radius: 1.2 + Math.random() * 2.9,
          alpha: 0.18 + Math.random() * 0.34,
          alphaSpeed: 0.003 + Math.random() * 0.008,
          colorIndex: Math.floor(Math.random() * colors.length),
        });
      }
    };

    resizeCanvas();
    populateParticles();

    const animate = (): void => {
      time += 0.016;

      context.clearRect(0, 0, host.clientWidth, host.clientHeight);

      const gradient = context.createRadialGradient(
        host.clientWidth * 0.5,
        host.clientHeight * 0.46,
        0,
        host.clientWidth * 0.5,
        host.clientHeight * 0.46,
        Math.max(host.clientWidth, host.clientHeight) * 0.72,
      );
      gradient.addColorStop(0, `rgba(${particlePalette[1]}, 0.27)`);
      gradient.addColorStop(0.5, `rgba(${particlePalette[0]}, 0.14)`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, host.clientWidth, host.clientHeight);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha += particle.alphaSpeed;

        if (particle.alpha > 0.52 || particle.alpha < 0.13) {
          particle.alphaSpeed *= -1;
        }

        if (particle.x < -12) {
          particle.x = host.clientWidth + 12;
        }
        if (particle.x > host.clientWidth + 12) {
          particle.x = -12;
        }
        if (particle.y < -12) {
          particle.y = host.clientHeight + 12;
        }
        if (particle.y > host.clientHeight + 12) {
          particle.y = -12;
        }

        const pulse = 0.87 + Math.sin(time * 1.55 + particle.x * 0.01 + particle.y * 0.01) * 0.26;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        context.fillStyle = `${colors[particle.colorIndex]}${Math.max(0.08, particle.alpha)})`;
        context.shadowBlur = 9;
        context.shadowColor = `${colors[particle.colorIndex]}0.48)`;
        context.fill();
      }

      context.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(animate);
    };

    if (isPlaying && currentSong) {
      animationFrame = window.requestAnimationFrame(animate);
    } else {
      context.clearRect(0, 0, host.clientWidth, host.clientHeight);
    }

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [currentSong, isPlaying, particlePalette]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="player-panel" aria-label="Player">
      <canvas
        ref={particlesCanvasRef}
        className={`player-particles ${isPlaying && currentSong ? "is-active" : ""}`}
        aria-hidden="true"
      />

      <div className="player-main">
        <div className="media-stage">
          <div className={`album-cover ${activeEngine === "YOUTUBE" ? "is-hidden" : ""}`}>
            {currentSong?.coverDataUrl ? (
              <img src={currentSong.coverDataUrl} alt={`Cover for ${currentSong.title}`} />
            ) : (
              <div className="cover-fallback">♪</div>
            )}
          </div>
          {youtubeSurface}
        </div>

        <div className="now-playing-block">
          <span className="now-playing-label">Now Playing</span>
          <h2>{currentSong?.title ?? "No song selected"}</h2>
          <p>{currentSong?.artist ?? "-"}</p>

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

      <div className="progress-block">
        <span>{formatSecondsToClock(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={Number.isFinite(progress) ? progress : 0}
          onChange={(event) => {
            const pct = Number(event.target.value);
            const nextTime = (Math.max(0, Math.min(100, pct)) / 100) * (duration || 0);
            onSeekTo(nextTime);
          }}
          aria-label="Playback position"
        />
        <span>{formatSecondsToClock(duration)}</span>
      </div>

      <div className="control-row">
        <button
          className={`btn-control ${isShuffleEnabled ? "is-toggled" : ""}`}
          type="button"
          onClick={onToggleShuffle}
        >
          Shuffle
        </button>
        <button className="btn-control" type="button" onClick={onPreviousSong}>
          Prev
        </button>
        <button className="btn-play" type="button" onClick={onTogglePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="btn-control" type="button" onClick={onNextSong}>
          Next
        </button>
        <button
          className={`btn-control ${isLoopEnabled ? "is-toggled" : ""}`}
          type="button"
          onClick={onToggleLoop}
        >
          Loop
        </button>
      </div>

      <div className="volume-row">
        <label htmlFor="volume-range">Volume</label>
        <input
          id="volume-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(volume * 100)}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
        />
      </div>
    </section>
  );
}
