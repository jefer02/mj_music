import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FAVORITES_PLAYLIST_ID,
  LIBRARY_PLAYLIST_ID,
  type Playlist,
} from "../types/playlist";
import type { Song } from "../types/song";
import {
  StorageService,
  type PersistedPlayerSettings,
} from "../services/StorageService";

const DEFAULT_SETTINGS: PersistedPlayerSettings = {
  volume: 0.8,
  isLoopEnabled: false,
  isShuffleEnabled: false,
};

export interface UseMusicLibraryResult {
  isReady: boolean;
  songs: Song[];
  playlists: Playlist[];
  activePlaylistId: string;
  activePlaylist: Playlist;
  visibleSongs: Song[];
  persistedSettings: PersistedPlayerSettings;
  setPersistedSettings: (settings: PersistedPlayerSettings) => void;
  setActivePlaylistId: (playlistId: string) => void;
  addSong: (song: Song, localBlob?: Blob) => Promise<void>;
  removeSongFromPlaylist: (songId: string, playlistId: string) => Promise<void>;
  createPlaylist: (name: string, songIds: string[]) => string | null;
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => void;
  deletePlaylist: (playlistId: string) => void;
  toggleFavorite: (songId: string) => void;
  isFavorite: (songId: string) => boolean;
}

export function useMusicLibrary(): UseMusicLibraryResult {
  const storageRef = useRef(new StorageService());
  const songsRef = useRef<Song[]>([]);

  const [isReady, setIsReady] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([
    {
      id: FAVORITES_PLAYLIST_ID,
      name: "Favorites",
      songIds: [],
      isSystem: true,
    },
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState(LIBRARY_PLAYLIST_ID);
  const [persistedSettings, setPersistedSettings] = useState<PersistedPlayerSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async (): Promise<void> => {
      await storageRef.current.init();
      const persisted = storageRef.current.loadAppState();
      const restoredSongs = await storageRef.current.restoreSongs(persisted.songs);

      if (isCancelled) {
        restoredSongs.forEach((song) => {
          if (song.localObjectUrl) {
            URL.revokeObjectURL(song.localObjectUrl);
          }
        });
        return;
      }

      const sanitizedUserPlaylists = sanitizeUserPlaylists(persisted.playlists, restoredSongs);

      setSongs(restoredSongs);
      setUserPlaylists(sanitizedUserPlaylists);
      setPersistedSettings(persisted.settings ?? DEFAULT_SETTINGS);
      setIsReady(true);
    };

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      songsRef.current.forEach((song) => {
        if (song.localObjectUrl) {
          URL.revokeObjectURL(song.localObjectUrl);
        }
      });
    };
  }, []);

  const playlists = useMemo<Playlist[]>(() => {
    return [
      {
        id: LIBRARY_PLAYLIST_ID,
        name: "Library",
        songIds: songs.map((song) => song.id),
        isSystem: true,
      },
      ...userPlaylists,
    ];
  }, [songs, userPlaylists]);

  const songMap = useMemo(() => {
    return new Map(songs.map((song) => [song.id, song]));
  }, [songs]);

  const activePlaylist = useMemo(() => {
    return playlists.find((playlist) => playlist.id === activePlaylistId) ?? playlists[0];
  }, [activePlaylistId, playlists]);

  useEffect(() => {
    if (!playlists.some((playlist) => playlist.id === activePlaylistId)) {
      setActivePlaylistId(LIBRARY_PLAYLIST_ID);
    }
  }, [activePlaylistId, playlists]);

  const visibleSongs = useMemo(() => {
    return activePlaylist.songIds
      .map((songId) => songMap.get(songId))
      .filter((song): song is Song => Boolean(song));
  }, [activePlaylist.songIds, songMap]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    storageRef.current.saveAppState({
      songs,
      playlists: userPlaylists,
      settings: persistedSettings,
    });

    const localSongIds = new Set(
      songs.filter((song) => song.sourceType === "LOCAL").map((song) => song.id),
    );

    void storageRef.current.cleanupOrphanAudio(localSongIds);
  }, [isReady, songs, userPlaylists, persistedSettings]);

  const addSong = useCallback(async (song: Song, localBlob?: Blob): Promise<void> => {
    setSongs((previousSongs) => {
      if (previousSongs.some((item) => item.id === song.id)) {
        return previousSongs;
      }

      return [...previousSongs, song];
    });

    if (song.sourceType === "LOCAL" && localBlob) {
      await storageRef.current.saveAudioBlob(song.id, localBlob);
    }
  }, []);

  const removeSongCompletely = useCallback(async (songId: string): Promise<void> => {
    let removedSong: Song | undefined;

    setSongs((previousSongs) => {
      const nextSongs = previousSongs.filter((song) => {
        if (song.id === songId) {
          removedSong = song;
          return false;
        }

        return true;
      });

      return nextSongs;
    });

    setUserPlaylists((previousPlaylists) => {
      return previousPlaylists.map((playlist) => ({
        ...playlist,
        songIds: playlist.songIds.filter((item) => item !== songId),
      }));
    });

    if (removedSong?.localObjectUrl) {
      URL.revokeObjectURL(removedSong.localObjectUrl);
    }

    await storageRef.current.deleteAudioBlob(songId).catch(() => undefined);
  }, []);

  const removeSongFromPlaylist = useCallback(
    async (songId: string, playlistId: string): Promise<void> => {
      if (playlistId === LIBRARY_PLAYLIST_ID) {
        await removeSongCompletely(songId);
        return;
      }

      setUserPlaylists((previousPlaylists) => {
        return previousPlaylists.map((playlist) => {
          if (playlist.id !== playlistId) {
            return playlist;
          }

          return {
            ...playlist,
            songIds: playlist.songIds.filter((item) => item !== songId),
          };
        });
      });
    },
    [removeSongCompletely],
  );

  const createPlaylist = useCallback(
    (name: string, songIds: string[]): string | null => {
      const cleanName = name.trim();
      if (!cleanName) {
        return null;
      }

      const cleanSongIds = uniqueSongIds(songIds).filter((songId) => songMap.has(songId));
      if (cleanSongIds.length === 0) {
        return null;
      }

      const playlistId = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nextPlaylist: Playlist = {
        id: playlistId,
        name: cleanName,
        songIds: cleanSongIds,
        isSystem: false,
      };

      setUserPlaylists((previousPlaylists) => [...previousPlaylists, nextPlaylist]);
      setActivePlaylistId(playlistId);
      return playlistId;
    },
    [songMap],
  );

  const addSongsToPlaylist = useCallback((playlistId: string, songIds: string[]): void => {
    if (playlistId === LIBRARY_PLAYLIST_ID) {
      return;
    }

    setUserPlaylists((previousPlaylists) => {
      return previousPlaylists.map((playlist) => {
        if (playlist.id !== playlistId) {
          return playlist;
        }

        const allowedSongIds = songIds.filter((songId) => songMap.has(songId));
        const mergedSongIds = uniqueSongIds([...playlist.songIds, ...allowedSongIds]);

        return {
          ...playlist,
          songIds: mergedSongIds,
        };
      });
    });
  }, [songMap]);

  const deletePlaylist = useCallback((playlistId: string): void => {
    if (playlistId === FAVORITES_PLAYLIST_ID || playlistId === LIBRARY_PLAYLIST_ID) {
      return;
    }

    setUserPlaylists((previousPlaylists) => {
      return previousPlaylists.filter((playlist) => playlist.id !== playlistId);
    });

    setActivePlaylistId((previousActiveId) => {
      if (previousActiveId === playlistId) {
        return LIBRARY_PLAYLIST_ID;
      }

      return previousActiveId;
    });
  }, []);

  const toggleFavorite = useCallback((songId: string): void => {
    if (!songMap.has(songId)) {
      return;
    }

    setUserPlaylists((previousPlaylists) => {
      const favoritesIndex = previousPlaylists.findIndex(
        (playlist) => playlist.id === FAVORITES_PLAYLIST_ID,
      );

      if (favoritesIndex === -1) {
        return [
          {
            id: FAVORITES_PLAYLIST_ID,
            name: "Favorites",
            songIds: [songId],
            isSystem: true,
          },
          ...previousPlaylists,
        ];
      }

      const nextPlaylists = [...previousPlaylists];
      const favoritesPlaylist = nextPlaylists[favoritesIndex];
      const isAlreadyFavorite = favoritesPlaylist.songIds.includes(songId);

      nextPlaylists[favoritesIndex] = {
        ...favoritesPlaylist,
        songIds: isAlreadyFavorite
          ? favoritesPlaylist.songIds.filter((id) => id !== songId)
          : [...favoritesPlaylist.songIds, songId],
      };

      return nextPlaylists;
    });
  }, [songMap]);

  const favoriteSongIds = useMemo(() => {
    const favoritesPlaylist = userPlaylists.find((playlist) => playlist.id === FAVORITES_PLAYLIST_ID);
    return new Set(favoritesPlaylist?.songIds ?? []);
  }, [userPlaylists]);

  const isFavorite = useCallback((songId: string): boolean => {
    return favoriteSongIds.has(songId);
  }, [favoriteSongIds]);

  return {
    isReady,
    songs,
    playlists,
    activePlaylistId,
    activePlaylist,
    visibleSongs,
    persistedSettings,
    setPersistedSettings,
    setActivePlaylistId,
    addSong,
    removeSongFromPlaylist,
    createPlaylist,
    addSongsToPlaylist,
    deletePlaylist,
    toggleFavorite,
    isFavorite,
  };
}

function sanitizeUserPlaylists(playlists: Playlist[], songs: Song[]): Playlist[] {
  const songIdSet = new Set(songs.map((song) => song.id));

  const sanitized = playlists
    .filter((playlist) => playlist.id !== LIBRARY_PLAYLIST_ID)
    .map((playlist) => {
      const isFavorites = playlist.id === FAVORITES_PLAYLIST_ID;
      return {
        ...playlist,
        isSystem: isFavorites,
        songIds: uniqueSongIds(playlist.songIds).filter((songId) => songIdSet.has(songId)),
      };
    });

  if (!sanitized.some((playlist) => playlist.id === FAVORITES_PLAYLIST_ID)) {
    sanitized.unshift({
      id: FAVORITES_PLAYLIST_ID,
      name: "Favorites",
      songIds: [],
      isSystem: true,
    });
  }

  const favorites = sanitized.find((playlist) => playlist.id === FAVORITES_PLAYLIST_ID)!;
  const customs = sanitized.filter((playlist) => playlist.id !== FAVORITES_PLAYLIST_ID);
  return [favorites, ...customs];
}

function uniqueSongIds(songIds: string[]): string[] {
  return [...new Set(songIds)];
}
