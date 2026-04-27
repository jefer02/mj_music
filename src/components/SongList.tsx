import { Play, Star, Trash2, Music } from "lucide-react";
import { HiResBadge } from "./HiResBadge";
import { SourceBadge } from "./SourceBadge";
import { EmptyState } from "./ui/EmptyState";
import { IconButton } from "./ui/IconButton";
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
    songs, activePlaylistId, currentSongId, selectedSongIds,
    onToggleSelected, onPlaySong, onRemoveSong, onToggleFavorite, isFavorite,
  } = props;

  const removeLabel = activePlaylistId === "library" ? "Remove from library" : "Remove from playlist";

  if (songs.length === 0) {
    return (
      <section className="panel song-panel" aria-label="Songs">
        <div className="panel-header-row">
          <h2 className="panel-title">Songs</h2>
        </div>
        <EmptyState
          icon={<Music size={40} strokeWidth={1.2} />}
          title="No songs here yet"
          description={
            activePlaylistId === "library"
              ? "Switch to Local or Online mode and add your first track."
              : "Add songs to this playlist from your library."
          }
        />
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
          const isActive = currentSongId === song.id;
          const isSelected = selectedSongIds.has(song.id);
          const isFav = isFavorite(song.id);

          return (
            <li key={song.id} className={`song-row ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}`}>
              {/* Checkbox + index */}
              <label className="song-check">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelected(song.id)}
                  aria-label={`Select ${song.title}`}
                />
                <span className="song-index">{index + 1}</span>
              </label>

              {/* Cover thumbnail */}
              <div className="song-thumb" aria-hidden="true">
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt="" />
                ) : (
                  <Music size={16} strokeWidth={1.4} />
                )}
                {isActive && (
                  <div className="song-thumb-playing">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>

              {/* Main info — click to play */}
              <button
                className="song-main"
                type="button"
                onClick={() => onPlaySong(song.id)}
                aria-label={`Play ${song.title} by ${song.artist}`}
              >
                <span className="song-title">{song.title}</span>
                <span className="song-artist">{song.artist}</span>
                <span className="song-meta-badges">
                  <SourceBadge sourceType={song.sourceType} />
                  <span className="hires-slot">
                    <HiResBadge isHiRes={song.isHiRes} />
                  </span>
                </span>
              </button>

              {/* Duration */}
              <span className="song-duration">{formatSecondsToClock(song.duration)}</span>

              {/* Actions */}
              <div className="song-actions">
                <IconButton
                  label={isFav ? "Remove from favorites" : "Add to favorites"}
                  isActive={isFav}
                  size="sm"
                  onClick={() => onToggleFavorite(song.id)}
                  className={isFav ? "fav-active" : ""}
                >
                  <Star size={14} fill={isFav ? "currentColor" : "none"} />
                </IconButton>

                <IconButton
                  label={removeLabel}
                  isDanger
                  size="sm"
                  onClick={() => onRemoveSong(song.id)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
