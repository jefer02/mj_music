import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocalAudioService } from "../services/LocalAudioService";
import type { PersistedPlayerSettings } from "../services/StorageService";
import type {
  PlaybackEngineType,
  YouTubePlayerCallbacks,
  YouTubePlayerHandle,
} from "../types/player";
import type { Song } from "../types/song";

export interface UsePlaybackEngineOptions {
  songs: Song[];
  playlistSongIds: string[];
  persistedSettings: PersistedPlayerSettings;
  settingsReady: boolean;
  onSettingsChange: (settings: PersistedPlayerSettings) => void;
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
  const {
    songs,
    playlistSongIds,
    persistedSettings,
    settingsReady,
    onSettingsChange,
  } = options;

  const songMap = useMemo(() => {
    return new Map(songs.map((song) => [song.id, song]));
  }, [songs]);

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

  const currentSong = useMemo(() => {
    if (!currentSongId) {
      return null;
    }

    return songMap.get(currentSongId) ?? null;
  }, [currentSongId, songMap]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const resolveNeighborSongId = useCallback(
    (direction: 1 | -1): string | null => {
      if (playlistSongIds.length === 0) {
        return null;
      }

      if (!currentSongId) {
        return playlistSongIds[0] ?? null;
      }

      if (isShuffleEnabled) {
        const candidates = playlistSongIds.filter((songId) => songId !== currentSongId);
        const pool = candidates.length > 0 ? candidates : playlistSongIds;
        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex] ?? null;
      }

      const index = playlistSongIds.indexOf(currentSongId);
      if (index === -1) {
        return playlistSongIds[0] ?? null;
      }

      const nextIndex = index + direction;
      if (nextIndex >= 0 && nextIndex < playlistSongIds.length) {
        return playlistSongIds[nextIndex] ?? null;
      }

      if (isLoopEnabled) {
        return direction === 1
          ? playlistSongIds[0] ?? null
          : playlistSongIds[playlistSongIds.length - 1] ?? null;
      }

      return null;
    },
    [currentSongId, isLoopEnabled, isShuffleEnabled, playlistSongIds],
  );

  const handleTrackEnded = useCallback(() => {
    const nextSongId = resolveNeighborSongId(1);

    if (!nextSongId) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    setCurrentSongId(nextSongId);
    setIsPlaying(true);
  }, [resolveNeighborSongId]);

  useEffect(() => {
    localAudioRef.current?.setCallbacks({
      onPlay: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") {
          return;
        }
        setIsPlaying(true);
      },
      onPause: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") {
          return;
        }
        setIsPlaying(false);
      },
      onEnded: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") {
          return;
        }
        handleTrackEnded();
      },
      onError: () => {
        if (currentSongRef.current?.sourceType !== "LOCAL") {
          return;
        }
        setIsPlaying(false);
      },
      onTimeUpdate: (value) => {
        if (currentSongRef.current?.sourceType !== "LOCAL") {
          return;
        }
        setCurrentTime(value);
      },
      onDurationChange: (value) => {
        if (currentSongRef.current?.sourceType !== "LOCAL") {
          return;
        }
        setDuration(value);
      },
    });
  }, [handleTrackEnded]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    setVolumeState(Math.max(0, Math.min(1, persistedSettings.volume)));
    setIsLoopEnabled(persistedSettings.isLoopEnabled);
    setIsShuffleEnabled(persistedSettings.isShuffleEnabled);
  }, [
    persistedSettings.isLoopEnabled,
    persistedSettings.isShuffleEnabled,
    persistedSettings.volume,
    settingsReady,
  ]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    onSettingsChange({
      volume,
      isLoopEnabled,
      isShuffleEnabled,
    });
  }, [isLoopEnabled, isShuffleEnabled, onSettingsChange, settingsReady, volume]);

  useEffect(() => {
    const localAudio = localAudioRef.current;
    const youtubePlayer = youtubePlayerRef.current;

    if (!localAudio) {
      return;
    }

    if (!currentSong) {
      localAudio.stop();
      youtubePlayer?.stop();
      localLoadedSongIdRef.current = null;
      youtubeLoadedSongIdRef.current = null;
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (currentSong.sourceType === "LOCAL") {
      youtubePlayer?.stop();
      youtubeLoadedSongIdRef.current = null;

      if (currentSong.localObjectUrl && localLoadedSongIdRef.current !== currentSong.id) {
        localAudio.loadSource(currentSong.localObjectUrl);
        localLoadedSongIdRef.current = currentSong.id;
        setCurrentTime(0);
        setDuration(currentSong.duration > 0 ? currentSong.duration : 0);
      }

      localAudio.setVolume(volume);

      if (isPlaying) {
        void localAudio.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        localAudio.pause();
      }

      return;
    }

    localAudio.stop();
    localLoadedSongIdRef.current = null;

    if (!currentSong.youtubeVideoId) {
      setIsPlaying(false);
      return;
    }

    if (youtubePlayer) {
      youtubePlayer.setVolume(volume);

      if (youtubeLoadedSongIdRef.current !== currentSong.id) {
        youtubePlayer.loadVideo(currentSong.youtubeVideoId, isPlaying);
        youtubeLoadedSongIdRef.current = currentSong.id;
        setCurrentTime(0);
      } else if (isPlaying) {
        youtubePlayer.play();
      } else {
        youtubePlayer.pause();
      }
    }
  }, [
    currentSong,
    isPlaying,
    volume,
    youtubeVersion,
  ]);

  useEffect(() => {
    if (!currentSongId) {
      return;
    }

    if (!songMap.has(currentSongId)) {
      setCurrentSongId(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentSongId, songMap]);

  const registerYouTubePlayer = useCallback((handle: YouTubePlayerHandle | null): void => {
    youtubePlayerRef.current = handle;
    setYouTubeVersion((previous) => previous + 1);

    if (handle) {
      handle.setVolume(volume);
    }
  }, [volume]);

  const playSong = useCallback((songId?: string): void => {
    if (songId) {
      setCurrentSongId(songId);
      setIsPlaying(true);
      return;
    }

    if (!currentSongId) {
      const firstSongId = playlistSongIds[0] ?? null;
      if (firstSongId) {
        setCurrentSongId(firstSongId);
        setIsPlaying(true);
      }
      return;
    }

    setIsPlaying(true);
  }, [currentSongId, playlistSongIds]);

  const togglePlayPause = useCallback((): void => {
    if (!currentSongId) {
      const firstSongId = playlistSongIds[0] ?? null;
      if (firstSongId) {
        setCurrentSongId(firstSongId);
        setIsPlaying(true);
      }
      return;
    }

    setIsPlaying((previous) => !previous);
  }, [currentSongId, playlistSongIds]);

  const nextSong = useCallback((): void => {
    const nextSongId = resolveNeighborSongId(1);
    if (!nextSongId) {
      return;
    }

    setCurrentSongId(nextSongId);
    setIsPlaying(true);
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

    const previousSongId = resolveNeighborSongId(-1);
    if (!previousSongId) {
      return;
    }

    setCurrentSongId(previousSongId);
    setIsPlaying(true);
  }, [currentSong?.sourceType, currentTime, resolveNeighborSongId]);

  const seekTo = useCallback((seconds: number): void => {
    const safeSeconds = Math.max(0, seconds);

    if (currentSong?.sourceType === "LOCAL") {
      localAudioRef.current?.seekTo(safeSeconds);
    } else {
      youtubePlayerRef.current?.seekTo(safeSeconds);
    }

    setCurrentTime(safeSeconds);
  }, [currentSong?.sourceType]);

  const setVolume = useCallback((value: number): void => {
    const safeValue = Math.max(0, Math.min(1, value));
    setVolumeState(safeValue);
    localAudioRef.current?.setVolume(safeValue);
    youtubePlayerRef.current?.setVolume(safeValue);
  }, []);

  const toggleLoop = useCallback((): void => {
    setIsLoopEnabled((previous) => !previous);
  }, []);

  const toggleShuffle = useCallback((): void => {
    setIsShuffleEnabled((previous) => !previous);
  }, []);

  const clearCurrentSong = useCallback((): void => {
    setCurrentSongId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    localAudioRef.current?.stop();
    youtubePlayerRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      localAudioRef.current?.destroy();
      youtubePlayerRef.current?.stop();
    };
  }, []);

  const youtubeCallbacks = useMemo<YouTubePlayerCallbacks>(() => {
    return {
      onPlay: () => {
        if (currentSongRef.current?.sourceType !== "YOUTUBE") {
          return;
        }
        setIsPlaying(true);
      },
      onPause: () => {
        if (currentSongRef.current?.sourceType !== "YOUTUBE") {
          return;
        }
        setIsPlaying(false);
      },
      onEnded: () => {
        if (currentSongRef.current?.sourceType !== "YOUTUBE") {
          return;
        }
        handleTrackEnded();
      },
      onDurationChange: (value) => {
        if (currentSongRef.current?.sourceType !== "YOUTUBE") {
          return;
        }
        setDuration(value);
      },
      onTimeUpdate: (value) => {
        if (currentSongRef.current?.sourceType !== "YOUTUBE") {
          return;
        }
        setCurrentTime(value);
      },
      onError: () => {
        if (currentSongRef.current?.sourceType !== "YOUTUBE") {
          return;
        }
        setIsPlaying(false);
      },
    };
  }, [handleTrackEnded]);

  const activeEngine: PlaybackEngineType = currentSong ? currentSong.sourceType : "NONE";

  return {
    currentSong,
    currentSongId,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoopEnabled,
    isShuffleEnabled,
    activeEngine,
    registerYouTubePlayer,
    youtubeCallbacks,
    playSong,
    togglePlayPause,
    nextSong,
    previousSong,
    seekTo,
    setVolume,
    toggleLoop,
    toggleShuffle,
    clearCurrentSong,
  };
}
