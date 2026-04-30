import { useState } from "react";
import { Trash2, PlusCircle, ListPlus, CheckSquare, Square, ListMusic } from "lucide-react";
import type { Playlist } from "../types/playlist";
import { LIBRARY_PLAYLIST_ID } from "../types/playlist";
import { Button } from "./ui/Button";
import { ConfirmModal } from "./ui/ConfirmModal";
import { useConfirm } from "../hooks/useConfirm";

interface PlaylistPanelProps {
  playlists: Playlist[];
  activePlaylistId: string;
  newPlaylistName: string;
  selectedSongCount: number;
  canAddSelectionToActive: boolean;
  onSelectPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onNewPlaylistNameChange: (value: string) => void;
  onCreatePlaylist: () => Promise<void>;
  onAddSelectionToActive: () => Promise<void>;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
}

export function PlaylistPanel(props: PlaylistPanelProps) {
  const {
    playlists, activePlaylistId, newPlaylistName, selectedSongCount,
    canAddSelectionToActive, onSelectPlaylist, onDeletePlaylist,
    onNewPlaylistNameChange, onCreatePlaylist, onAddSelectionToActive,
    onSelectAllVisible, onClearSelection,
  } = props;

  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();
  const [isCreating, setIsCreating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleDeletePlaylist = async (playlistId: string, name: string): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete playlist",
      message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      isDangerous: true,
    });
    if (confirmed) await onDeletePlaylist(playlistId);
  };

  const handleCreatePlaylist = async (): Promise<void> => {
    setIsCreating(true);
    try { await onCreatePlaylist(); }
    finally { setIsCreating(false); }
  };

  const handleAddToActive = async (): Promise<void> => {
    setIsAdding(true);
    try { await onAddSelectionToActive(); }
    finally { setIsAdding(false); }
  };

  return (
    <aside className="panel playlist-panel" aria-label="Playlists">
      <div className="panel-header-row">
        <h2 className="panel-title">
          <ListMusic size={16} /> Playlists
        </h2>
      </div>

      <ul className="playlist-list">
        {playlists.map((playlist) => {
          const isActive = playlist.id === activePlaylistId;
          const isLibrary = playlist.id === LIBRARY_PLAYLIST_ID;
          const emoji = isLibrary ? "" : playlist.name === "Favorites" ? "★" : "♫";

          return (
            <li key={playlist.id} className={`playlist-row ${isActive ? "is-active" : ""}`}>
              <button
                className="playlist-row-button"
                type="button"
                onClick={() => onSelectPlaylist(playlist.id)}
              >
                <span className="playlist-row-emoji" aria-hidden="true">{emoji}</span>
                <span className="playlist-name">{playlist.name}</span>
                <span className="playlist-count">{playlist.songIds.length}</span>
              </button>

              {!playlist.isSystem && (
                <button
                  className="playlist-delete-btn"
                  type="button"
                  onClick={() => void handleDeletePlaylist(playlist.id, playlist.name)}
                  aria-label={`Delete ${playlist.name}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Create playlist section */}
      <div className="playlist-actions">
        <h3 className="playlist-actions-title">New playlist from selection</h3>

        <input
          className="input-field"
          type="text"
          value={newPlaylistName}
          onChange={(e) => onNewPlaylistNameChange(e.target.value)}
          placeholder="Playlist name…"
          maxLength={40}
        />

        <div className="inline-actions">
          <button className="btn-soft btn-sm" type="button" onClick={onSelectAllVisible}>
            <CheckSquare size={13} /> Select all
          </button>
          <button className="btn-soft btn-sm" type="button" onClick={onClearSelection}>
            <Square size={13} /> Clear
          </button>
        </div>

        <Button
          variant="primary"
          fullWidth
          isLoading={isCreating}
          onClick={() => void handleCreatePlaylist()}
          disabled={isCreating || !newPlaylistName.trim() || selectedSongCount === 0}
        >
          <PlusCircle size={15} /> Create ({selectedSongCount})
        </Button>

        <Button
          variant="soft"
          fullWidth
          isLoading={isAdding}
          disabled={!canAddSelectionToActive || isAdding}
          onClick={() => void handleAddToActive()}
        >
          <ListPlus size={15} /> Add to active playlist
        </Button>
      </div>

      {/* Confirm modal for delete */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          isDangerous={confirmState.isDangerous}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </aside>
  );
}
