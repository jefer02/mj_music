import { HiResBadge } from "./HiResBadge";
import { SourceBadge } from "./SourceBadge";
import type { Song } from "../types/song";
import { formatSecondsToClock } from "../utils/time";

interface SongListProps {
  songs: Song[];
  activePlaylistId: string;
  currentSongId: string | null;
  selectedSongIds: Set<string>;
  onToggleSelected: (songId: string) => void;
  onPlaySong: (songId: string) => void;
  onRemoveSong: (songId: string) => void;
  onToggleFavorite: (songId: string) => void;
  isFavorite: (songId: string) => boolean;
}

export function SongList(props: SongListProps) {
  const {
    songs,
    activePlaylistId,
    currentSongId,
    selectedSongIds,
    onToggleSelected,
    onPlaySong,
    onRemoveSong,
    onToggleFavorite,
    isFavorite,
  } = props;

  if (songs.length === 0) {
    return (
      <section className="panel song-panel" aria-label="Songs">
        <div className="panel-header-row">
          <h2 className="panel-title">Songs</h2>
        </div>
        <div className="empty-state">No songs in this playlist.</div>
      </section>
    );
  }

  return (
    <section className="panel song-panel" aria-label="Songs">
      <div className="panel-header-row">
        <h2 className="panel-title">Songs</h2>
        <span className="panel-badge">{songs.length} tracks</span>
      </div>

      <ul className="song-list">
        {songs.map((song, index) => {
          const active = currentSongId === song.id;
          const removeLabel =
            activePlaylistId === "library" ? "Remove from library" : "Remove from playlist";

          return (
            <li key={song.id} className={`song-row ${active ? "is-active" : ""}`}>
              <label className="song-check">
                <input
                  type="checkbox"
                  checked={selectedSongIds.has(song.id)}
                  onChange={() => onToggleSelected(song.id)}
                />
                <span>{index + 1}</span>
              </label>

              <button className="song-main" type="button" onClick={() => onPlaySong(song.id)}>
                <span className="song-title">{song.title}</span>
                <span className="song-artist">{song.artist}</span>
                <span className="song-meta-badges">
                  <SourceBadge sourceType={song.sourceType} />
                  <span className="hires-slot">
                    <HiResBadge isHiRes={song.isHiRes} />
                  </span>
                </span>
              </button>

              <span className="song-duration">{formatSecondsToClock(song.duration)}</span>

              <div className="song-actions">
                <button
                  className={`btn-icon ${isFavorite(song.id) ? "is-favorite" : ""}`}
                  type="button"
                  onClick={() => onToggleFavorite(song.id)}
                  aria-label="Toggle favorite"
                  title="Favorites"
                >
                  ★
                </button>

                <button
                  className="btn-icon btn-danger"
                  type="button"
                  onClick={() => onRemoveSong(song.id)}
                  aria-label={removeLabel}
                  title={removeLabel}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
