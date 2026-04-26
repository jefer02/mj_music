import type { YouTubePlayerCallbacks } from "../types/player";

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayerInstance;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerInstance {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
let apiReadyPromise: Promise<void> | null = null;

export class YouTubePlayerService {
  private player: YouTubePlayerInstance | null = null;
  private callbacks: YouTubePlayerCallbacks;
  private syncTimer: number | null = null;
  private pendingVideoId: string | null = null;
  private pendingAutoplay: boolean = false;

  constructor(callbacks: YouTubePlayerCallbacks) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: YouTubePlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  async mount(container: HTMLElement): Promise<void> {
    await loadYouTubeIframeApi();

    if (!window.YT) {
      throw new Error("YouTube API is not available");
    }

    this.player = new window.YT.Player(container, {
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: () => {
          if (this.pendingVideoId) {
            this.loadVideo(this.pendingVideoId, this.pendingAutoplay);
            this.pendingVideoId = null;
          }
        },
        onStateChange: (event: { data: number }) => {
          this.handleStateChange(event.data);
        },
        onError: () => {
          this.callbacks.onError();
        },
      },
    });
  }

  loadVideo(videoId: string, autoplay: boolean): void {
    if (!this.player) {
      this.pendingVideoId = videoId;
      this.pendingAutoplay = autoplay;
      return;
    }

    const loaded = this.invokePlayer("loadVideoById", videoId);
    if (!loaded) {
      this.pendingVideoId = videoId;
      this.pendingAutoplay = autoplay;
      return;
    }

    if (!autoplay) {
      window.setTimeout(() => {
        this.invokePlayer("pauseVideo");
      }, 120);
    }
  }

  play(): void {
    this.invokePlayer("playVideo");
  }

  pause(): void {
    this.invokePlayer("pauseVideo");
  }

  stop(): void {
    this.invokePlayer("stopVideo");
    this.stopSyncTimer();
  }

  seekTo(seconds: number): void {
    this.invokePlayer("seekTo", Math.max(0, seconds), true);
  }

  setVolume(volume: number): void {
    this.invokePlayer("setVolume", Math.round(Math.max(0, Math.min(1, volume)) * 100));
  }

  destroy(): void {
    this.stopSyncTimer();
    this.player?.destroy();
    this.player = null;
  }

  private handleStateChange(state: number): void {
    if (!window.YT) {
      return;
    }

    if (state === window.YT.PlayerState.PLAYING) {
      this.callbacks.onPlay();
      this.startSyncTimer();
      this.callbacks.onDurationChange(this.safeDuration());
      return;
    }

    if (state === window.YT.PlayerState.PAUSED) {
      this.callbacks.onPause();
      this.stopSyncTimer();
      return;
    }

    if (state === window.YT.PlayerState.ENDED) {
      this.callbacks.onEnded();
      this.stopSyncTimer();
    }
  }

  private startSyncTimer(): void {
    this.stopSyncTimer();

    this.syncTimer = window.setInterval(() => {
      this.callbacks.onTimeUpdate(this.safeCurrentTime());
      this.callbacks.onDurationChange(this.safeDuration());
    }, 400);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer !== null) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private safeCurrentTime(): number {
    if (!this.player) {
      return 0;
    }

    try {
      return this.player.getCurrentTime() || 0;
    } catch {
      return 0;
    }
  }

  private safeDuration(): number {
    if (!this.player) {
      return 0;
    }

    try {
      return this.player.getDuration() || 0;
    } catch {
      return 0;
    }
  }

  private invokePlayer(method: string, ...args: unknown[]): boolean {
    const playerCandidate = this.player as unknown as Record<string, unknown> | null;
    const candidate = playerCandidate?.[method];

    if (typeof candidate !== "function") {
      return false;
    }

    try {
      (candidate as (...values: unknown[]) => unknown).apply(this.player, args);
      return true;
    } catch {
      return false;
    }
  }
}

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve();
  }

  if (apiReadyPromise) {
    return apiReadyPromise;
  }

  apiReadyPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${YOUTUBE_API_SRC}"]`);

    const onReady = (): void => {
      resolve();
    };

    const onError = (): void => {
      reject(new Error("Could not load YouTube API"));
    };

    window.onYouTubeIframeAPIReady = () => {
      onReady();
    };

    if (existingScript) {
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = YOUTUBE_API_SRC;
    script.async = true;
    script.onerror = onError;
    document.head.appendChild(script);
  });

  return apiReadyPromise;
}
