import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddTrackPanel } from "./components/AddTrackPanel";
import { AppHeader } from "./components/AppHeader";
import { PlayerPanel } from "./components/PlayerPanel";
import { PlaylistPanel } from "./components/PlaylistPanel";
import { SongList } from "./components/SongList";
import { YouTubePlayerSurface } from "./components/YouTubePlayerSurface";
import { useMusicLibrary } from "./hooks/useMusicLibrary";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine";
import { LIBRARY_PLAYLIST_ID } from "./types/playlist";
import type { Song } from "./types/song";
import { detectHiResFromLocalTrack, detectHiResFromTextHint } from "./utils/hiRes";
import { buildSongId, parseFileNameFallback, readAudioDuration, readSongTags } from "./utils/metadata";
import {
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  extractYouTubeVideoId,
} from "./utils/youtube";

interface NotificationState {
  message: string;
  tone: "success" | "info" | "warning" | "error";
}

export function App() {
  const {
    isReady,
    songs,
    playlists,
    activePlaylist,
    activePlaylistId,
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
  } = useMusicLibrary();

  const playback = usePlaybackEngine({
    songs,
    playlistSongIds: activePlaylist.songIds,
    persistedSettings,
    settingsReady: isReady,
    onSettingsChange: setPersistedSettings,
  });

  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const persistedTheme = localStorage.getItem("mjmusic_theme");
    return persistedTheme === "dark" ? "dark" : "light";
  });
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const notificationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add("app-ready");
    document.body.classList.remove("app-loading");
    document.body.setAttribute("data-theme", theme);

    const loader = document.getElementById("app-loader");
    if (loader) {
      window.setTimeout(() => loader.remove(), 360);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("mjmusic_theme", theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current !== null) {
        window.clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  const notify = useCallback((message: string, tone: NotificationState["tone"] = "info"): void => {
    setNotification({ message, tone });

    if (notificationTimerRef.current !== null) {
      window.clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = window.setTimeout(() => {
      setNotification(null);
    }, 3200);
  }, []);

  const songsById = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);

  const handleAddLocalFiles = useCallback(
    async (files: File[]): Promise<void> => {
      let added = 0;
      let ignored = 0;
      let duplicated = 0;

      for (const file of files) {
        if (!file.type.startsWith("audio/")) {
          ignored++;
          continue;
        }

        const duplicateLocalSong = songs.some(
          (song) =>
            song.sourceType === "LOCAL" &&
            song.localFileName === file.name &&
            song.localFileSize === file.size,
        );

        if (duplicateLocalSong) {
          duplicated++;
          continue;
        }

        const fallback = parseFileNameFallback(file.name);
        const tags = await readSongTags(file);
        const duration = await readAudioDuration(file);
        const hiResData = detectHiResFromLocalTrack(file.size, duration);

        const localSong: Song = {
          id: buildSongId("local"),
          title: tags.title ?? fallback.title,
          artist: tags.artist ?? fallback.artist,
          duration,
          sourceType: "LOCAL",
          localObjectUrl: URL.createObjectURL(file),
          localFileName: file.name,
          localFileSize: file.size,
          youtubeUrl: null,
          youtubeVideoId: null,
          coverDataUrl: tags.coverDataUrl,
          bitrateKbps: hiResData.bitrateKbps,
          isHiRes: hiResData.isHiRes,
          createdAt: Date.now(),
        };

        await addSong(localSong, file);
        added++;
      }

      if (added > 0) {
        notify(`${added} local song(s) added`, "success");
      }

      if (duplicated > 0) {
        notify(`${duplicated} duplicated local song(s) were skipped`, "warning");
      }

      if (ignored > 0) {
        notify(`${ignored} file(s) were ignored because they are not audio`, "warning");
      }
    },
    [addSong, notify, songs],
  );

  const handleAddYouTubeSong = useCallback(
    async (input: { url: string; title: string; artist: string }): Promise<void> => {
      const videoId = extractYouTubeVideoId(input.url);
      if (!videoId) {
        notify("Invalid YouTube URL or videoId", "error");
        return;
      }

      const alreadyExists = songs.some(
        (song) => song.sourceType === "YOUTUBE" && song.youtubeVideoId === videoId,
      );

      if (alreadyExists) {
        notify("This YouTube song already exists in your library", "warning");
        return;
      }

      const title = input.title.trim() || `YouTube Track ${videoId}`;
      const artist = input.artist.trim() || "YouTube";
      const hiResData = detectHiResFromTextHint(title, artist);

      const youtubeSong: Song = {
        id: buildSongId("yt"),
        title,
        artist,
        duration: 0,
        sourceType: "YOUTUBE",
        localObjectUrl: null,
        localFileName: "",
        localFileSize: 0,
        youtubeUrl: buildYouTubeWatchUrl(videoId),
        youtubeVideoId: videoId,
        coverDataUrl: buildYouTubeThumbnailUrl(videoId),
        bitrateKbps: hiResData.bitrateKbps,
        isHiRes: hiResData.isHiRes,
        createdAt: Date.now(),
      };

      await addSong(youtubeSong);
      notify("YouTube song added", "success");
    },
    [addSong, notify, songs],
  );

  const handleToggleSelected = useCallback((songId: string): void => {
    setSelectedSongIds((previousSelected) => {
      const nextSelected = new Set(previousSelected);
      if (nextSelected.has(songId)) {
        nextSelected.delete(songId);
      } else {
        nextSelected.add(songId);
      }
      return nextSelected;
    });
  }, []);

  const handleSelectAllVisible = useCallback((): void => {
    setSelectedSongIds(new Set(visibleSongs.map((song) => song.id)));
  }, [visibleSongs]);

  const handleClearSelection = useCallback((): void => {
    setSelectedSongIds(new Set());
  }, []);

  const handleCreatePlaylist = useCallback((): void => {
    const playlistId = createPlaylist(newPlaylistName, Array.from(selectedSongIds));

    if (!playlistId) {
      notify("Select songs and provide a playlist name", "warning");
      return;
    }

    setSelectedSongIds(new Set());
    setNewPlaylistName("");
    notify("Playlist created", "success");
  }, [createPlaylist, newPlaylistName, notify, selectedSongIds]);

  const handleAddSelectionToActive = useCallback((): void => {
    if (activePlaylistId === LIBRARY_PLAYLIST_ID) {
      notify("Select a custom playlist or Favorites first", "warning");
      return;
    }

    const selected = Array.from(selectedSongIds).filter((songId) => songsById.has(songId));
    if (selected.length === 0) {
      notify("No selected songs to add", "warning");
      return;
    }

    const existingSet = new Set(activePlaylist.songIds);
    const toAdd = selected.filter((songId) => !existingSet.has(songId));
    if (toAdd.length === 0) {
      notify("All selected songs already exist in active playlist", "info");
      return;
    }

    addSongsToPlaylist(activePlaylistId, selected);
    notify(`${toAdd.length} song(s) added to active playlist`, "success");
  }, [
    activePlaylist,
    activePlaylistId,
    addSongsToPlaylist,
    notify,
    selectedSongIds,
    songsById,
  ]);

  const handleRemoveSong = useCallback(
    async (songId: string): Promise<void> => {
      const removeFromLibrary = activePlaylistId === LIBRARY_PLAYLIST_ID;
      const wasCurrentSong = playback.currentSongId === songId;

      await removeSongFromPlaylist(songId, activePlaylistId);

      setSelectedSongIds((previousSelected) => {
        const nextSelected = new Set(previousSelected);
        nextSelected.delete(songId);
        return nextSelected;
      });

      if (wasCurrentSong) {
        playback.clearCurrentSong();
      }

      notify(removeFromLibrary ? "Song removed from library" : "Song removed from playlist", "info");
    },
    [activePlaylistId, notify, playback, removeSongFromPlaylist],
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: string): void => {
      const playlist = playlists.find((item) => item.id === playlistId);
      if (!playlist || playlist.isSystem) {
        return;
      }

      const confirmed = window.confirm(`Delete playlist \"${playlist.name}\"?`);
      if (!confirmed) {
        return;
      }

      deletePlaylist(playlistId);
      notify("Playlist deleted", "info");
    },
    [deletePlaylist, notify, playlists],
  );

  const canAddSelectionToActive =
    activePlaylistId !== LIBRARY_PLAYLIST_ID && selectedSongIds.size > 0;

  return (
    <div className="app-shell">
      <div className="bg-shape bg-shape-left" aria-hidden="true" />
      <div className="bg-shape bg-shape-right" aria-hidden="true" />

      <AppHeader
        theme={theme}
        onToggleTheme={() => setTheme((previousTheme) => (previousTheme === "light" ? "dark" : "light"))}
      />

      <PlayerPanel
        currentSong={playback.currentSong}
        isPlaying={playback.isPlaying}
        currentTime={playback.currentTime}
        duration={playback.duration}
        volume={playback.volume}
        isLoopEnabled={playback.isLoopEnabled}
        isShuffleEnabled={playback.isShuffleEnabled}
        activeEngine={playback.activeEngine}
        onTogglePlayPause={playback.togglePlayPause}
        onNextSong={playback.nextSong}
        onPreviousSong={playback.previousSong}
        onToggleLoop={playback.toggleLoop}
        onToggleShuffle={playback.toggleShuffle}
        onSeekTo={playback.seekTo}
        onVolumeChange={playback.setVolume}
        youtubeSurface={
          <YouTubePlayerSurface
            isVisible={playback.activeEngine === "YOUTUBE"}
            callbacks={playback.youtubeCallbacks}
            onPlayerReady={playback.registerYouTubePlayer}
          />
        }
      />

      <main className="content-grid">
        <div className="left-column">
          <AddTrackPanel onAddLocalFiles={handleAddLocalFiles} onAddYouTubeSong={handleAddYouTubeSong} />

          <PlaylistPanel
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            newPlaylistName={newPlaylistName}
            selectedSongCount={selectedSongIds.size}
            canAddSelectionToActive={canAddSelectionToActive}
            onSelectPlaylist={setActivePlaylistId}
            onDeletePlaylist={handleDeletePlaylist}
            onNewPlaylistNameChange={setNewPlaylistName}
            onCreatePlaylist={handleCreatePlaylist}
            onAddSelectionToActive={handleAddSelectionToActive}
            onSelectAllVisible={handleSelectAllVisible}
            onClearSelection={handleClearSelection}
          />
        </div>

        <SongList
          songs={visibleSongs}
          activePlaylistId={activePlaylistId}
          currentSongId={playback.currentSongId}
          selectedSongIds={selectedSongIds}
          onToggleSelected={handleToggleSelected}
          onPlaySong={playback.playSong}
          onRemoveSong={(songId) => void handleRemoveSong(songId)}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      </main>

      {notification && (
        <div className={`notification is-visible ${notification.tone}`} role="status" aria-live="polite">
          {notification.message}
        </div>
      )}
    </div>
  );
}
