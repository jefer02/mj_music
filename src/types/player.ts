import type { TrackSourceType } from "./song";

export type PlaybackEngineType = TrackSourceType | "NONE";

export interface PlaybackState {
  currentSongId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
  activeEngine: PlaybackEngineType;
}

export interface YouTubePlayerHandle {
  loadVideo: (videoId: string, autoplay: boolean) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

export interface YouTubePlayerCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onDurationChange: (duration: number) => void;
  onTimeUpdate: (currentTime: number) => void;
  onError: () => void;
}
