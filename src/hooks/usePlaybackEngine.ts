import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalAudioService } from "../services/LocalAudioService";
import { getMediaBlobUrl } from "../api/apiClient";
import type {
  PlaybackEngineType,
  YouTubePlayerCallbacks,
  YouTubePlayerHandle,
} from "../types/player";
import type { Song } from "../types/song";
import type { PlayerSettings } from "./useMusicLibrary";

export interface UsePlaybackEngineOptions {
  songs: Song[];
  playlistSongIds: string[];
  playerSettings: PlayerSettings;
  settingsReady: boolean;
  onSettingsChange: (settings: Partial<PlayerSettings>) => void;
}

export interface UsePlaybackEngineResult {
  currentSong: Song | null;
  currentSongId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
  activeEngine: PlaybackEngineType;
  registerYouTubePlayer: (handle: YouTubePlayerHandle | null) => void;
  youtubeCallbacks: YouTubePlayerCallbacks;
  playSong: (songId?: string) => void;
  togglePlayPause: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  clearCurrentSong: () => void;
}

export function usePlaybackEngine(options: UsePlaybackEngineOptions): UsePlaybackEngineResult {
  const { songs, playlistSongIds, playerSettings, settingsReady, onSettingsChange } = options;

  const songMap = useMemo(
    () => new Map(songs.map((s) => [s.id, s])),
    [songs],
  );

  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [youtubeVersion, setYouTubeVersion] = useState(0);

  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);
  const localLoadedSongIdRef = useRef<string | null>(null);
  const youtubeLoadedSongIdRef = useRef<string | null>(null);
  const currentSongRef = useRef<Song | null>(null);

  // Local audio service — created once
  const localAudioRef = useRef<LocalAudioService | null>(null);
  if (!localAudioRef.current) {
    localAudioRef.current = new LocalAudioService({
      onPlay: () => undefined,
      onPause: () => undefined,
      onEnded: () => undefined,
      onError: () => undefined,
      onTimeUpdate: () => undefined,
      onDurationChange: () => undefined,
    });
  }

  const currentSong = useMemo(
    () => (currentSongId ? (songMap.get(currentSongId) ?? null) : null),
    [currentSongId, songMap],
  );

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const resolveNeighborSongId = useCallback(
    (direction: 1 | -1): string | null => {
      if (playlistSongIds.length === 0) return null;
      if (!currentSongId) return playlistSongIds[0] ?? null;

      if (isShuffleEnabled) {
        const candidates = playlistSongIds.filter((id) => id !== currentSongId);
        const pool = candidates.length > 0 ? candidates : playlistSongIds;
        return pool[Math.floor(Math.random() * pool.length)] ?? null;
      }

      const index = playlistSongIds.indexOf(currentSongId);
      if (index === -1) return playlistSongIds[0] ?? null;

      const next = index + direction;
      if (next >= 0 && next < playlistSongIds.length) return playlistSongIds[next] ?? null;
      if (isLoopEnabled) {
        return direction === 1
          ? (playlistSongIds[0] ?? null)
          : (playlistSongIds[playlistSongIds.length - 1] ?? null);
      }
      return null;
    },
    [currentSongId, isLoopEnabled, isShuffleEnabled, playlistSongIds],
  );

  const handleTrackEnded = useCallback(() => {
    const nextId = resolveNeighborSongId(1);
    if (!nextId) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }
    setCurrentSongId(nextId);
    setIsPlaying(true);
  }, [resolveNeighborSongId]);

  // ── Wire local audio callbacks ────────────────────────────────────────────

  useEffect(() => {
    localAudioRef.current?.setCallbacks({
      onPlay: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") return;
        setIsPlaying(true);
      },
      onPause: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") return;
        setIsPlaying(false);
      },
      onEnded: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") return;
        handleTrackEnded();
      },
      onError: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") return;
        setIsPlaying(false);
      },
      onTimeUpdate: (val) => {
        if (currentSongRef.current?.sourceType !== "LOCAL") return;
        setCurrentTime(val);
      },
      onDurationChange: (val) => {
        if (currentSongRef.current?.sourceType !== "LOCAL") return;
        setDuration(val);
      },
    });
  }, [handleTrackEnded]);

  // ── Apply persisted settings on ready ────────────────────────────────────

  useEffect(() => {
    if (!settingsReady) return;
    setVolumeState(Math.max(0, Math.min(1, playerSettings.volume)));
    setIsLoopEnabled(playerSettings.isLoopEnabled);
    setIsShuffleEnabled(playerSettings.isShuffleEnabled);
  }, [
    playerSettings.isLoopEnabled,
    playerSettings.isShuffleEnabled,
    playerSettings.volume,
    settingsReady,
  ]);

  // ── Playback engine effect ────────────────────────────────────────────────

  useEffect(() => {
    const localAudio = localAudioRef.current;
    const ytPlayer = youtubePlayerRef.current;

    if (!localAudio) return;

    if (!currentSong) {
      localAudio.stop();
      ytPlayer?.stop();
      localLoadedSongIdRef.current = null;
      youtubeLoadedSongIdRef.current = null;
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (currentSong.sourceType === "LOCAL") {
      ytPlayer?.stop();
      youtubeLoadedSongIdRef.current = null;

      if (localLoadedSongIdRef.current !== currentSong.id) {
        localLoadedSongIdRef.current = currentSong.id;
        setCurrentTime(0);

        // Fetch audio with auth → blob URL
        void getMediaBlobUrl(currentSong.id).then((blobUrl) => {
          if (!blobUrl || localLoadedSongIdRef.current !== currentSong.id) return;
          localAudio.loadSource(blobUrl);
          if (isPlaying) {
            void localAudio.play().catch(() => setIsPlaying(false));
          }
        });
        return;
      }

      localAudio.setVolume(volume);
      if (isPlaying) {
        void localAudio.play().catch(() => setIsPlaying(false));
      } else {
        localAudio.pause();
      }
      return;
    }

    // YouTube
    localAudio.stop();
    localLoadedSongIdRef.current = null;

    if (!currentSong.youtubeVideoId) {
      setIsPlaying(false);
      return;
    }

    if (ytPlayer) {
      ytPlayer.setVolume(volume);
      if (youtubeLoadedSongIdRef.current !== currentSong.id) {
        ytPlayer.loadVideo(currentSong.youtubeVideoId, isPlaying);
        youtubeLoadedSongIdRef.current = currentSong.id;
        setCurrentTime(0);
      } else if (isPlaying) {
        ytPlayer.play();
      } else {
        ytPlayer.pause();
      }
    }
  }, [currentSong, isPlaying, volume, youtubeVersion]);

  // Clear current song if it was deleted from the library
  useEffect(() => {
    if (currentSongId && !songMap.has(currentSongId)) {
      setCurrentSongId(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSongId, songMap]);

  // ── YouTube player registration ───────────────────────────────────────────

  const registerYouTubePlayer = useCallback((handle: YouTubePlayerHandle | null): void => {
    youtubePlayerRef.current = handle;
    setYouTubeVersion((v) => v + 1);
    if (handle) handle.setVolume(volume);
  }, [volume]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const playSong = useCallback((songId?: string): void => {
    if (songId) {
      setCurrentSongId(songId);
      setIsPlaying(true);
      return;
    }
    if (!currentSongId) {
      const first = playlistSongIds[0];
      if (first) { setCurrentSongId(first); setIsPlaying(true); }
      return;
    }
    setIsPlaying(true);
  }, [currentSongId, playlistSongIds]);

  const togglePlayPause = useCallback((): void => {
    if (!currentSongId) {
      const first = playlistSongIds[0];
      if (first) { setCurrentSongId(first); setIsPlaying(true); }
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [currentSongId, playlistSongIds]);

  const nextSong = useCallback((): void => {
    const id = resolveNeighborSongId(1);
    if (id) { setCurrentSongId(id); setIsPlaying(true); }
  }, [resolveNeighborSongId]);

  const previousSong = useCallback((): void => {
    if (currentTime > 3) {
      if (currentSong?.sourceType === "LOCAL") {
        localAudioRef.current?.seekTo(0);
      } else {
        youtubePlayerRef.current?.seekTo(0);
      }
      setCurrentTime(0);
      return;
    }
    const id = resolveNeighborSongId(-1);
    if (id) { setCurrentSongId(id); setIsPlaying(true); }
  }, [currentSong?.sourceType, currentTime, resolveNeighborSongId]);

  const seekTo = useCallback((seconds: number): void => {
    const safe = Math.max(0, seconds);
    if (currentSong?.sourceType === "LOCAL") {
      localAudioRef.current?.seekTo(safe);
    } else {
      youtubePlayerRef.current?.seekTo(safe);
    }
    setCurrentTime(safe);
  }, [currentSong?.sourceType]);

  const setVolume = useCallback((value: number): void => {
    const safe = Math.max(0, Math.min(1, value));
    setVolumeState(safe);
    localAudioRef.current?.setVolume(safe);
    youtubePlayerRef.current?.setVolume(safe);
    onSettingsChange({ volume: safe });
  }, [onSettingsChange]);

  const toggleLoop = useCallback((): void => {
    setIsLoopEnabled((prev) => {
      onSettingsChange({ isLoopEnabled: !prev });
      return !prev;
    });
  }, [onSettingsChange]);

  const toggleShuffle = useCallback((): void => {
    setIsShuffleEnabled((prev) => {
      onSettingsChange({ isShuffleEnabled: !prev });
      return !prev;
    });
  }, [onSettingsChange]);

  const clearCurrentSong = useCallback((): void => {
    setCurrentSongId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    localAudioRef.current?.stop();
    youtubePlayerRef.current?.stop();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      localAudioRef.current?.destroy();
      youtubePlayerRef.current?.stop();
    };
  }, []);

  // ── YouTube callbacks (memoized to avoid re-mounting the surface) ─────────

  const youtubeCallbacks = useMemo<YouTubePlayerCallbacks>(() => ({
    onPlay: () => {
      if (currentSongRef.current?.sourceType !== "YOUTUBE") return;
      setIsPlaying(true);
    },
    onPause: () => {
      if (currentSongRef.current?.sourceType !== "YOUTUBE") return;
      setIsPlaying(false);
    },
    onEnded: () => {
      if (currentSongRef.current?.sourceType !== "YOUTUBE") return;
      handleTrackEnded();
    },
    onDurationChange: (val) => {
      if (currentSongRef.current?.sourceType !== "YOUTUBE") return;
      setDuration(val);
    },
    onTimeUpdate: (val) => {
      if (currentSongRef.current?.sourceType !== "YOUTUBE") return;
      setCurrentTime(val);
    },
    onError: () => {
      if (currentSongRef.current?.sourceType !== "YOUTUBE") return;
      setIsPlaying(false);
    },
  }), [handleTrackEnded]);

  const activeEngine: PlaybackEngineType = currentSong ? currentSong.sourceType : "NONE";

  return {
    currentSong, currentSongId, isPlaying, currentTime, duration,
    volume, isLoopEnabled, isShuffleEnabled, activeEngine,
    registerYouTubePlayer, youtubeCallbacks,
    playSong, togglePlayPause, nextSong, previousSong, seekTo,
    setVolume, toggleLoop, toggleShuffle, clearCurrentSong,
  };
}
