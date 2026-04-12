/**
 * Song.ts
 * Represents a single audio track with its metadata and file reference.
 * The actual audio blob is managed separately by StorageService (IndexedDB).
 */

export class Song {
  /** Unique identifier for the song (timestamp-based) */
  readonly id: string;

  /** Song title (extracted from filename or user-provided) */
  title: string;

  /** Artist name */
  artist: string;

  /** Duration in seconds (-1 if not yet loaded) */
  duration: number;

  /** In-memory object URL created from the audio blob */
  objectUrl: string | null;

  /** Original file name */
  fileName: string;

  /** File size in bytes */
  fileSize: number;

  constructor(params: {
    id?: string;
    title: string;
    artist?: string;
    duration?: number;
    objectUrl?: string | null;
    fileName?: string;
    fileSize?: number;
  }) {
    this.id = params.id ?? `song_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.title = params.title;
    this.artist = params.artist ?? "Artista desconocido";
    this.duration = params.duration ?? -1;
    this.objectUrl = params.objectUrl ?? null;
    this.fileName = params.fileName ?? "";
    this.fileSize = params.fileSize ?? 0;
  }

  /** Returns a human-readable duration string (mm:ss) */
  get durationFormatted(): string {
    if (this.duration < 0) return "--:--";
    const minutes = Math.floor(this.duration / 60);
    const seconds = Math.floor(this.duration % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  /** Serializes the song metadata to a plain object (for localStorage) */
  toJSON(): SongMetadata {
    return {
      id: this.id,
      title: this.title,
      artist: this.artist,
      duration: this.duration,
      fileName: this.fileName,
      fileSize: this.fileSize,
    };
  }

  /** Creates a Song from serialized metadata (objectUrl must be restored separately) */
  static fromJSON(data: SongMetadata): Song {
    return new Song(data);
  }
}

/** Plain metadata object — safe to store in localStorage (no Blob/URL) */
export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  duration: number;
  fileName: string;
  fileSize: number;
}
