export interface LocalAudioCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onError: () => void;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
}

export class LocalAudioService {
  private readonly audio: HTMLAudioElement;
  private callbacks: LocalAudioCallbacks;

  constructor(callbacks: LocalAudioCallbacks) {
    this.callbacks = callbacks;
    this.audio = new Audio();
    this.audio.preload = "metadata";

    this.audio.addEventListener("play", () => this.callbacks.onPlay());
    this.audio.addEventListener("pause", () => this.callbacks.onPause());
    this.audio.addEventListener("ended", () => this.callbacks.onEnded());
    this.audio.addEventListener("error", () => this.callbacks.onError());
    this.audio.addEventListener("timeupdate", () => this.callbacks.onTimeUpdate(this.currentTime));
    this.audio.addEventListener("loadedmetadata", () => this.callbacks.onDurationChange(this.duration));
  }

  setCallbacks(callbacks: LocalAudioCallbacks): void {
    this.callbacks = callbacks;
  }

  loadSource(sourceUrl: string): void {
    if (!sourceUrl) {
      return;
    }

    if (this.audio.src === sourceUrl) {
      return;
    }

    this.audio.src = sourceUrl;
    this.audio.load();
  }

  async play(): Promise<void> {
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seekTo(seconds: number): void {
    if (!Number.isFinite(this.audio.duration) || this.audio.duration <= 0) {
      return;
    }

    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  get currentTime(): number {
    return Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
  }

  get duration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  destroy(): void {
    this.stop();
    this.audio.src = "";
  }
}
