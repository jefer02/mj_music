import { useCallback, useEffect, useMemo, useState } from "react";
import { libraryApi } from "../api/libraryApi";
import { songsApi } from "../api/songsApi";
import { playlistsApi } from "../api/playlistsApi";
import { favoritesApi } from "../api/favoritesApi";
import { settingsApi } from "../api/settingsApi";
import { ApiError, revokeMediaBlobUrl, getToken } from "../api/apiClient";
import { mapApiSong } from "../types/song";
import {
  FAVORITES_PLAYLIST_ID,
  LIBRARY_PLAYLIST_ID,
  type Playlist,
} from "../types/playlist";
import type { Song } from "../types/song";
import type { ApiSettings } from "../types/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type LoadStage = "idle" | "library" | "playlists" | "settings" | "ready" | "error";

export interface PlayerSettings {
  volume: number;
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
}

const DEFAULT_SETTINGS: PlayerSettings = {
  volume: 0.8,
  isLoopEnabled: false,
  isShuffleEnabled: false,
};

export interface UseMusicLibraryResult {
  loadStage: LoadStage;
  loadError: string | null;
  songs: Song[];
  playlists: Playlist[];
  activePlaylistId: string;
  activePlaylist: Playlist;
  visibleSongs: Song[];
  playerSettings: PlayerSettings;
  setActivePlaylistId: (id: string) => void;
  uploadLocalFile: (file: File) => Promise<void>;
  addYouTubeSong: (data: { url: string; title: string; artist: string }) => Promise<void>;
  removeSongFromPlaylist: (songId: string, playlistId: string) => Promise<void>;
  createPlaylist: (name: string, songIds: string[]) => Promise<string | null>;
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  isFavorite: (songId: string) => boolean;
  updatePlayerSettings: (settings: Partial<PlayerSettings>) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMusicLibrary(): UseMusicLibraryResult {
  const [loadStage, setLoadStage] = useState<LoadStage>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [activePlaylistId, setActivePlaylistId] = useState(LIBRARY_PLAYLIST_ID);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      // Guest mode: no token → skip API, open with empty library
      if (!getToken()) {
        setLoadStage("ready");
        return;
      }

      try {
        setLoadStage("library");
        const library = await libraryApi.get();
        if (cancelled) return;

        const mappedSongs = library.songs.map(mapApiSong);
        setSongs(mappedSongs);

        setLoadStage("playlists");
        const systemFavorites: Playlist = {
          id: FAVORITES_PLAYLIST_ID,
          name: "Favorites",
          songIds: library.favorites,
          isSystem: true,
        };
        const customPlaylists = library.playlists
          .filter((p) => !p.isSystem && p.id !== FAVORITES_PLAYLIST_ID)
          .map((p) => ({ ...p, isSystem: false as const }));
        setUserPlaylists([systemFavorites, ...customPlaylists]);
        setFavoriteSongIds(new Set(library.favorites));

        setLoadStage("settings");
        setPlayerSettings({
          volume: library.settings.volume ?? DEFAULT_SETTINGS.volume,
          isLoopEnabled: library.settings.isLoopEnabled ?? DEFAULT_SETTINGS.isLoopEnabled,
          isShuffleEnabled: library.settings.isShuffleEnabled ?? DEFAULT_SETTINGS.isShuffleEnabled,
        });

        setLoadStage("ready");
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `Failed to load library (${err.status}): ${err.message}`
            : "Failed to connect to the server";
        setLoadError(msg);
        setLoadStage("error");
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  // ── Derived playlists ──────────────────────────────────────────────────────

  const playlists = useMemo<Playlist[]>(() => {
    const libraryPlaylist: Playlist = {
      id: LIBRARY_PLAYLIST_ID,
      name: "Library",
      songIds: songs.map((s) => s.id),
      isSystem: true,
    };
    return [libraryPlaylist, ...userPlaylists];
  }, [songs, userPlaylists]);

  const songMap = useMemo(
    () => new Map(songs.map((s) => [s.id, s])),
    [songs],
  );

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === activePlaylistId) ?? playlists[0],
    [activePlaylistId, playlists],
  );

  // Reset active playlist if it was deleted
  useEffect(() => {
    if (!playlists.some((p) => p.id === activePlaylistId)) {
      setActivePlaylistId(LIBRARY_PLAYLIST_ID);
    }
  }, [activePlaylistId, playlists]);

  const visibleSongs = useMemo(
    () =>
      activePlaylist.songIds
        .map((id) => songMap.get(id))
        .filter((s): s is Song => s !== undefined),
    [activePlaylist.songIds, songMap],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const uploadLocalFile = useCallback(async (file: File): Promise<void> => {
    const apiSong = await songsApi.upload(file);
    const song = mapApiSong(apiSong);
    setSongs((prev) => {
      if (prev.some((s) => s.id === song.id)) return prev;
      return [...prev, song];
    });
  }, []);

  const addYouTubeSong = useCallback(
    async (data: { url: string; title: string; artist: string }): Promise<void> => {
      const apiSong = await songsApi.addYouTube(data);
      const song = mapApiSong(apiSong);
      setSongs((prev) => {
        if (prev.some((s) => s.id === song.id)) return prev;
        return [...prev, song];
      });
    },
    [],
  );

  const removeSongCompletely = useCallback(async (songId: string): Promise<void> => {
    await songsApi.delete(songId);
    revokeMediaBlobUrl(songId);
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setUserPlaylists((prev) =>
      prev.map((p) => ({ ...p, songIds: p.songIds.filter((id) => id !== songId) })),
    );
    setFavoriteSongIds((prev) => {
      const next = new Set(prev);
      next.delete(songId);
      return next;
    });
  }, []);

  const removeSongFromPlaylist = useCallback(
    async (songId: string, playlistId: string): Promise<void> => {
      if (playlistId === LIBRARY_PLAYLIST_ID) {
        await removeSongCompletely(songId);
        return;
      }
      await playlistsApi.removeSong(playlistId, songId);
      setUserPlaylists((prev) =>
        prev.map((p) =>
          p.id !== playlistId ? p : { ...p, songIds: p.songIds.filter((id) => id !== songId) },
        ),
      );
    },
    [removeSongCompletely],
  );

  const createPlaylist = useCallback(
    async (name: string, songIds: string[]): Promise<string | null> => {
      const cleanName = name.trim();
      if (!cleanName) return null;
      const validIds = [...new Set(songIds)].filter((id) => songMap.has(id));
      if (validIds.length === 0) return null;

      const apiPlaylist = await playlistsApi.create({ name: cleanName, songIds: validIds });
      const playlist: Playlist = { ...apiPlaylist, isSystem: false };
      setUserPlaylists((prev) => [...prev, playlist]);
      setActivePlaylistId(playlist.id);
      return playlist.id;
    },
    [songMap],
  );

  const addSongsToPlaylist = useCallback(
    async (playlistId: string, songIds: string[]): Promise<void> => {
      if (playlistId === LIBRARY_PLAYLIST_ID) return;
      const validIds = songIds.filter((id) => songMap.has(id));
      if (validIds.length === 0) return;

      const apiPlaylist = await playlistsApi.addSongs(playlistId, validIds);
      setUserPlaylists((prev) =>
        prev.map((p) => (p.id !== playlistId ? p : { ...p, songIds: apiPlaylist.songIds })),
      );
    },
    [songMap],
  );

  const deletePlaylist = useCallback(async (playlistId: string): Promise<void> => {
    if (playlistId === FAVORITES_PLAYLIST_ID || playlistId === LIBRARY_PLAYLIST_ID) return;
    await playlistsApi.delete(playlistId);
    setUserPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    setActivePlaylistId((prev) => (prev === playlistId ? LIBRARY_PLAYLIST_ID : prev));
  }, []);

  const toggleFavorite = useCallback(async (songId: string): Promise<void> => {
    if (!songMap.has(songId)) return;
    const isAlready = favoriteSongIds.has(songId);

    // Optimistic update
    setFavoriteSongIds((prev) => {
      const next = new Set(prev);
      isAlready ? next.delete(songId) : next.add(songId);
      return next;
    });
    setUserPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== FAVORITES_PLAYLIST_ID) return p;
        return {
          ...p,
          songIds: isAlready
            ? p.songIds.filter((id) => id !== songId)
            : [...p.songIds, songId],
        };
      }),
    );

    // API call (roll back on error)
    try {
      if (isAlready) {
        await favoritesApi.remove(songId);
      } else {
        await favoritesApi.add(songId);
      }
    } catch {
      // Rollback
      setFavoriteSongIds((prev) => {
        const next = new Set(prev);
        isAlready ? next.add(songId) : next.delete(songId);
        return next;
      });
      setUserPlaylists((prev) =>
        prev.map((p) => {
          if (p.id !== FAVORITES_PLAYLIST_ID) return p;
          return {
            ...p,
            songIds: isAlready
              ? [...p.songIds, songId]
              : p.songIds.filter((id) => id !== songId),
          };
        }),
      );
    }
  }, [favoriteSongIds, songMap]);

  const isFavorite = useCallback(
    (songId: string): boolean => favoriteSongIds.has(songId),
    [favoriteSongIds],
  );

  const updatePlayerSettings = useCallback(
    (partial: Partial<PlayerSettings>): void => {
      setPlayerSettings((prev) => {
        const next = { ...prev, ...partial };
        // Fire and forget — persist to API
        const apiPayload: Partial<ApiSettings> = {};
        if (partial.volume !== undefined) apiPayload.volume = next.volume;
        if (partial.isLoopEnabled !== undefined) apiPayload.isLoopEnabled = next.isLoopEnabled;
        if (partial.isShuffleEnabled !== undefined) apiPayload.isShuffleEnabled = next.isShuffleEnabled;
        void settingsApi.patch(apiPayload).catch(() => undefined);
        return next;
      });
    },
    [],
  );

  return {
    loadStage,
    loadError,
    songs,
    playlists,
    activePlaylistId,
    activePlaylist,
    visibleSongs,
    playerSettings,
    setActivePlaylistId,
    uploadLocalFile,
    addYouTubeSong,
    removeSongFromPlaylist,
    createPlaylist,
    addSongsToPlaylist,
    deletePlaylist,
    toggleFavorite,
    isFavorite,
    updatePlayerSettings,
  };
}
