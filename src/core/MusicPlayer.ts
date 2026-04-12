/**
 * MusicPlayer.ts
 * Orchestrates audio playback using the HTMLAudioElement.
 * Communicates with Playlist to navigate songs and fires events
 * that UIController listens to in order to update the interface.
 */

import { Song } from "../models/Song";
import { Playlist } from "./Playlist";

export type PlayerEvent =
  | "play"
  | "pause"
  | "ended"
  | "songChanged"
  | "timeUpdate"
  | "durationLoaded"
  | "error";

type EventCallback = (player: MusicPlayer) => void;

export class MusicPlayer {
  private audio: HTMLAudioElement;
  private _playlist: Playlist | null = null;
  private _isPlaying: boolean = false;
  private listeners: Map<PlayerEvent, EventCallback[]> = new Map();

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";

    // Attach native audio element events
    this.audio.addEventListener("ended", () => this.handleEnded());
    this.audio.addEventListener("timeupdate", () => this.emit("timeUpdate"));
    this.audio.addEventListener("loadedmetadata", () => this.handleMetadataLoaded());
    this.audio.addEventListener("error", () => this.emit("error"));
  }

  // ─────────────────────────────────────────────
  // Playlist binding
  // ─────────────────────────────────────────────

  /** Binds a playlist to the player. Stops current playback. */
  setPlaylist(playlist: Playlist): void {
    this.stop();
    this._playlist = playlist;
  }

  get playlist(): Playlist | null {
    return this._playlist;
  }

  // ─────────────────────────────────────────────
  // Playback controls
  // ─────────────────────────────────────────────

  /**
   * Loads and plays the current song in the playlist.
   * If a different song is provided, sets it as current first.
   */
  play(song?: Song): void {
    if (!this._playlist) return;

    if (song) {
      // Select the song in the playlist
      this._playlist.selectById(song.id);
    }

    const current = this._playlist.currentSong;
    if (!current || !current.objectUrl) return;

    // Only reload the source if the song changed
    if (this.audio.src !== current.objectUrl) {
      this.audio.src = current.objectUrl;
      this.audio.load();
    }

    this.audio
      .play()
      .then(() => {
        this._isPlaying = true;
        this.emit("play");
        this.emit("songChanged");
      })
      .catch((err) => {
        console.error("Error al reproducir:", err);
        this.emit("error");
      });
  }

  /** Pauses playback */
  pause(): void {
    if (!this._isPlaying) return;
    this.audio.pause();
    this._isPlaying = false;
    this.emit("pause");
  }

  /** Toggles between play and pause */
  togglePlay(): void {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /** Stops playback and resets position */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this._isPlaying = false;
    this.emit("pause");
  }

  /** Moves to the next song and plays it */
  next(): void {
    if (!this._playlist) return;
    const wasPlaying = this._isPlaying;
    this._playlist.next();
    this.loadCurrentSong();
    if (wasPlaying) this.play();
    else this.emit("songChanged");
  }

  /** Moves to the previous song and plays it */
  previous(): void {
    if (!this._playlist) return;

    // If we're more than 3 seconds in, restart current song
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    const wasPlaying = this._isPlaying;
    this._playlist.previous();
    this.loadCurrentSong();
    if (wasPlaying) this.play();
    else this.emit("songChanged");
  }

  /** Seeks to a specific time in seconds */
  seekTo(seconds: number): void {
    if (this.audio.duration) {
      this.audio.currentTime = Math.min(Math.max(0, seconds), this.audio.duration);
    }
  }

  /** Sets volume (0.0 – 1.0) */
  setVolume(volume: number): void {
    this.audio.volume = Math.min(1, Math.max(0, volume));
  }

  get volume(): number {
    return this.audio.volume;
  }

  // ─────────────────────────────────────────────
  // State getters
  // ─────────────────────────────────────────────

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentTime(): number {
    return this.audio.currentTime;
  }

  get duration(): number {
    return isNaN(this.audio.duration) ? 0 : this.audio.duration;
  }

  get currentSong(): Song | null {
    return this._playlist?.currentSong ?? null;
  }

  get progress(): number {
    if (!this.duration) return 0;
    return (this.audio.currentTime / this.duration) * 100;
  }

  // ─────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────

  private loadCurrentSong(): void {
    const current = this._playlist?.currentSong;
    if (current?.objectUrl) {
      this.audio.src = current.objectUrl;
      this.audio.load();
    }
  }

  private handleEnded(): void {
    this._isPlaying = false;
    this.emit("ended");

    // Auto-advance to next song if available
    if (this._playlist?.hasNext()) {
      this.next();
    }
  }

  private handleMetadataLoaded(): void {
    const current = this._playlist?.currentSong;
    if (current) {
      current.duration = this.audio.duration;
    }
    this.emit("durationLoaded");
  }

  // ─────────────────────────────────────────────
  // Event system (simple pub/sub)
  // ─────────────────────────────────────────────

  on(event: PlayerEvent, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: PlayerEvent, callback: EventCallback): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx !== -1) cbs.splice(idx, 1);
  }

  private emit(event: PlayerEvent): void {
    this.listeners.get(event)?.forEach((cb) => cb(this));
  }
}
