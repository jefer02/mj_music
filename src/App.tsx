import { useCallback, useEffect, useMemo, useState } from "react";
import { Ghost, LogIn } from "lucide-react";
import { AddTrackPanel } from "./components/AddTrackPanel";
import { AppHeader } from "./components/AppHeader";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginModal } from "./components/LoginModal";
import { PlayerPanel } from "./components/PlayerPanel";
import { PlaylistPanel } from "./components/PlaylistPanel";
import { SongList } from "./components/SongList";
import { YouTubePlayerSurface } from "./components/YouTubePlayerSurface";
import { ToastContainer } from "./components/ui/Toast";
import { useAuth } from "./context/AuthContext";
import { useMusicLibrary } from "./hooks/useMusicLibrary";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine";
import { useNotification } from "./context/NotificationContext";
import { ApiError } from "./api/apiClient";
import { LIBRARY_PLAYLIST_ID } from "./types/playlist";
import { extractYouTubeVideoId } from "./utils/youtube";

function GuestBanner() {
  const { logout } = useAuth();
  return (
    <div className="guest-banner" role="status">
      <Ghost size={15} />
      <span>Guest mode — your data is not saved. <strong>Sign in</strong> to sync your library.</span>
      <button type="button" className="guest-banner-btn" onClick={logout}>
        <LogIn size={13} /> Sign in
      </button>
    </div>
  );
}

// ── Authenticated shell ───────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { notify } = useNotification();
  const { isGuest } = useAuth();

  const library = useMusicLibrary();
  const {
    loadStage, loadError, songs, playlists, activePlaylist, activePlaylistId,
    visibleSongs, playerSettings, setActivePlaylistId,
    uploadLocalFile, addYouTubeSong, removeSongFromPlaylist,
    createPlaylist, addSongsToPlaylist, deletePlaylist,
    toggleFavorite, isFavorite, updatePlayerSettings,
  } = library;

  const playback = usePlaybackEngine({
    songs,
    playlistSongIds: activePlaylist.songIds,
    playerSettings,
    settingsReady: loadStage === "ready",
    onSettingsChange: updatePlayerSettings,
  });

  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Show loading screen until ready
  if (loadStage !== "ready" && loadStage !== "error") {
    return <LoadingScreen stage={loadStage === "idle" ? "library" : loadStage} />;
  }

  if (loadStage === "error") {
    return (
      <div className="error-screen">
        <div className="error-screen-content">
          <h2>Failed to connect to server</h2>
          <p>{loadError}</p>
          <button type="button" className="btn btn--primary btn--md" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <AppShell
    library={library}
    playback={playback}
    songs={songs}
    playlists={playlists}
    activePlaylist={activePlaylist}
    activePlaylistId={activePlaylistId}
    visibleSongs={visibleSongs}
    playerSettings={playerSettings}
    setActivePlaylistId={setActivePlaylistId}
    uploadLocalFile={uploadLocalFile}
    addYouTubeSong={addYouTubeSong}
    removeSongFromPlaylist={removeSongFromPlaylist}
    createPlaylist={createPlaylist}
    addSongsToPlaylist={addSongsToPlaylist}
    deletePlaylist={deletePlaylist}
    toggleFavorite={toggleFavorite}
    isFavorite={isFavorite}
    updatePlayerSettings={updatePlayerSettings}
    notify={notify}
    isGuest={isGuest}
    selectedSongIds={selectedSongIds}
    setSelectedSongIds={setSelectedSongIds}
    newPlaylistName={newPlaylistName}
    setNewPlaylistName={setNewPlaylistName}
  />;
}

// ── App Shell (only mounted when data is ready) ───────────────────────────────

function AppShell({
  library, playback, songs, playlists, activePlaylist, activePlaylistId, visibleSongs,
  setActivePlaylistId, uploadLocalFile, addYouTubeSong, removeSongFromPlaylist,
  createPlaylist, addSongsToPlaylist, deletePlaylist, toggleFavorite, isFavorite,
  notify, isGuest, selectedSongIds, setSelectedSongIds, newPlaylistName, setNewPlaylistName,
}: any) {
  const songsById = useMemo(() => new Map(songs.map((s: any) => [s.id, s])), [songs]);

  const handleUploadLocalFile = useCallback(async (file: File): Promise<void> => {
    try {
      await uploadLocalFile(file);
      notify(`"${file.name}" added to library`, "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Upload failed";
      notify(msg, "error");
    }
  }, [uploadLocalFile, notify]);

  const handleAddYouTubeSong = useCallback(async (input: { url: string; title: string; artist: string }): Promise<void> => {
    const videoId = extractYouTubeVideoId(input.url);
    if (!videoId) {
      notify("Invalid YouTube URL", "error");
      return;
    }
    const already = songs.some((s: any) => s.sourceType === "YOUTUBE" && s.youtubeVideoId === videoId);
    if (already) {
      notify("This YouTube song is already in your library", "warning");
      return;
    }
    try {
      await addYouTubeSong(input);
      notify("YouTube song added", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to add YouTube song";
      notify(msg, "error");
    }
  }, [addYouTubeSong, notify, songs]);

  const handleToggleSelected = useCallback((songId: string): void => {
    setSelectedSongIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.has(songId) ? next.delete(songId) : next.add(songId);
      return next;
    });
  }, [setSelectedSongIds]);

  const handleSelectAllVisible = useCallback((): void => {
    setSelectedSongIds(new Set(visibleSongs.map((s: any) => s.id)));
  }, [visibleSongs, setSelectedSongIds]);

  const handleClearSelection = useCallback((): void => {
    setSelectedSongIds(new Set());
  }, [setSelectedSongIds]);

  const handleCreatePlaylist = useCallback(async (): Promise<void> => {
    if (!newPlaylistName.trim() || selectedSongIds.size === 0) {
      notify("Enter a name and select songs first", "warning");
      return;
    }
    try {
      const id = await createPlaylist(newPlaylistName, Array.from(selectedSongIds));
      if (!id) { notify("Could not create playlist", "warning"); return; }
      setSelectedSongIds(new Set());
      setNewPlaylistName("");
      notify("Playlist created", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to create playlist", "error");
    }
  }, [createPlaylist, newPlaylistName, notify, selectedSongIds, setNewPlaylistName, setSelectedSongIds]);

  const handleAddSelectionToActive = useCallback(async (): Promise<void> => {
    if (activePlaylistId === LIBRARY_PLAYLIST_ID) {
      notify("Select a custom playlist or Favorites first", "warning");
      return;
    }
    const toAdd = Array.from(selectedSongIds).filter((id) => songsById.has(id));
    if (toAdd.length === 0) { notify("No valid songs selected", "warning"); return; }
    const existing = new Set(activePlaylist.songIds);
    const fresh = toAdd.filter((id) => !existing.has(id));
    if (fresh.length === 0) { notify("All selected songs already in this playlist", "info"); return; }
    try {
      await addSongsToPlaylist(activePlaylistId, fresh);
      notify(`${fresh.length} song(s) added`, "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to add songs", "error");
    }
  }, [activePlaylist.songIds, activePlaylistId, addSongsToPlaylist, notify, selectedSongIds, songsById]);

  const handleRemoveSong = useCallback(async (songId: string): Promise<void> => {
    const wasPlaying = playback.currentSongId === songId;
    try {
      await removeSongFromPlaylist(songId, activePlaylistId);
      if (wasPlaying) playback.clearCurrentSong();
      setSelectedSongIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      notify(activePlaylistId === LIBRARY_PLAYLIST_ID ? "Song removed from library" : "Song removed from playlist", "info");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to remove song", "error");
    }
  }, [activePlaylistId, notify, playback, removeSongFromPlaylist, setSelectedSongIds]);

  const handleDeletePlaylist = useCallback(async (playlistId: string): Promise<void> => {
    try {
      await deletePlaylist(playlistId);
      notify("Playlist deleted", "info");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete playlist", "error");
    }
  }, [deletePlaylist, notify]);

  const handleToggleFavorite = useCallback(async (songId: string): Promise<void> => {
    try {
      await toggleFavorite(songId);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to update favorites", "error");
    }
  }, [notify, toggleFavorite]);

  const canAddSelectionToActive = activePlaylistId !== LIBRARY_PLAYLIST_ID && selectedSongIds.size > 0;

  return (
    <div className="app-shell">
      <div className="bg-shape bg-shape-left" aria-hidden="true" />
      <div className="bg-shape bg-shape-right" aria-hidden="true" />

      <AppHeader onLogoClick={() => window.location.reload()} />

      {isGuest && <GuestBanner />}

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
          <AddTrackPanel
            onUploadLocalFile={handleUploadLocalFile}
            onAddYouTubeSong={handleAddYouTubeSong}
          />

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
          onRemoveSong={(id) => void handleRemoveSong(id)}
          onToggleFavorite={(id) => void handleToggleFavorite(id)}
          isFavorite={isFavorite}
        />
      </main>

      <ToastContainer />
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────

export function App() {
  const { isAuthenticated } = useAuth();

  // Dismiss the static HTML loader once React has mounted
  useEffect(() => {
    document.body.classList.remove("app-loading");
    document.body.classList.add("app-ready");
  }, []);

  return isAuthenticated ? <AuthenticatedApp /> : <LoginModal />;
}
