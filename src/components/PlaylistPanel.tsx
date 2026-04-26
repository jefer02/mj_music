import type { Playlist } from "../types/playlist";

interface PlaylistPanelProps {
  playlists: Playlist[];
  activePlaylistId: string;
  newPlaylistName: string;
  selectedSongCount: number;
  canAddSelectionToActive: boolean;
  onSelectPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onNewPlaylistNameChange: (value: string) => void;
  onCreatePlaylist: () => void;
  onAddSelectionToActive: () => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
}

export function PlaylistPanel(props: PlaylistPanelProps) {
  const {
    playlists,
    activePlaylistId,
    newPlaylistName,
    selectedSongCount,
    canAddSelectionToActive,
    onSelectPlaylist,
    onDeletePlaylist,
    onNewPlaylistNameChange,
    onCreatePlaylist,
    onAddSelectionToActive,
    onSelectAllVisible,
    onClearSelection,
  } = props;

  return (
    <aside className="panel playlist-panel" aria-label="Playlists">
      <div className="panel-header-row">
        <h2 className="panel-title">Playlists</h2>
      </div>

      <ul className="playlist-list">
        {playlists.map((playlist) => {
          const isActive = playlist.id === activePlaylistId;

          return (
            <li key={playlist.id} className={`playlist-row ${isActive ? "is-active" : ""}`}>
              <button
                className="playlist-row-button"
                type="button"
                onClick={() => onSelectPlaylist(playlist.id)}
              >
                <span className="playlist-name">{playlist.name}</span>
                <span className="playlist-count">{playlist.songIds.length} tracks</span>
              </button>

              {!playlist.isSystem && (
                <button
                  className="btn-icon btn-danger"
                  type="button"
                  onClick={() => onDeletePlaylist(playlist.id)}
                  aria-label={`Delete ${playlist.name}`}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="playlist-actions">
        <h3>Create playlist from selected songs</h3>
        <input
          className="input-field"
          type="text"
          value={newPlaylistName}
          onChange={(event) => onNewPlaylistNameChange(event.target.value)}
          placeholder="Playlist name"
          maxLength={40}
        />

        <div className="inline-actions">
          <button className="btn-soft" type="button" onClick={onSelectAllVisible}>
            Select visible
          </button>
          <button className="btn-soft" type="button" onClick={onClearSelection}>
            Clear
          </button>
        </div>

        <button className="btn-primary" type="button" onClick={onCreatePlaylist}>
          Create playlist ({selectedSongCount})
        </button>

        <button
          className="btn-soft"
          type="button"
          disabled={!canAddSelectionToActive}
          onClick={onAddSelectionToActive}
        >
          Add selection to active playlist
        </button>
      </div>
    </aside>
  );
}
