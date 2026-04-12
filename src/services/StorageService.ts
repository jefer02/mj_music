/**
 * StorageService.ts
 *
 * WHY IndexedDB?
 * ─────────────────────────────────────────────────────────────────────────────
 * localStorage only stores strings and is capped at ~5 MB per origin.
 * Audio files can easily be tens of megabytes, so they cannot be stored there.
 *
 * IndexedDB is the browser-native solution for large binary data:
 *   - Stores Blob objects natively (no base64 conversion needed)
 *   - No practical size limit (typically up to ~50% of free disk space)
 *   - Asynchronous, non-blocking API
 *   - Persists across page reloads and browser restarts
 *
 * Strategy used here:
 *   - Audio blobs → IndexedDB (object store "audio_blobs", key = song.id)
 *   - Song metadata + playlist data → localStorage (serialized as JSON)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Song, SongMetadata } from "../models/Song";
import { PlaylistData } from "../core/Playlist";

const DB_NAME = "MJMusicDB";
const DB_VERSION = 1;
const AUDIO_STORE = "audio_blobs";

const LS_SONGS_KEY = "mjmusic_songs";
const LS_PLAYLISTS_KEY = "mjmusic_playlists";

export class StorageService {
  private db: IDBDatabase | null = null;

  // ─────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────

  /**
   * Opens (or creates) the IndexedDB database.
   * Must be called once before any audio storage operations.
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE); // key-path not set → manual key
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // ─────────────────────────────────────────────
  // Audio blob operations (IndexedDB)
  // ─────────────────────────────────────────────

  /** Saves an audio Blob in IndexedDB, keyed by song ID */
  async saveAudioBlob(songId: string, blob: Blob): Promise<void> {
    if (!this.db) throw new Error("IndexedDB no inicializado");

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readwrite");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.put(blob, songId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Retrieves an audio Blob from IndexedDB. Returns null if not found. */
  async getAudioBlob(songId: string): Promise<Blob | null> {
    if (!this.db) throw new Error("IndexedDB no inicializado");

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.get(songId);

      request.onsuccess = () => resolve((request.result as Blob) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Deletes an audio Blob from IndexedDB */
  async deleteAudioBlob(songId: string): Promise<void> {
    if (!this.db) throw new Error("IndexedDB no inicializado");

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readwrite");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.delete(songId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Returns all song IDs currently stored in IndexedDB */
  async getAllStoredIds(): Promise<string[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  // ─────────────────────────────────────────────
  // Song metadata operations (localStorage)
  // ─────────────────────────────────────────────

  /** Saves all song metadata to localStorage */
  saveSongsMetadata(songs: Song[]): void {
    const data: SongMetadata[] = songs.map((s) => s.toJSON());
    localStorage.setItem(LS_SONGS_KEY, JSON.stringify(data));
  }

  /** Loads all song metadata from localStorage */
  loadSongsMetadata(): SongMetadata[] {
    const raw = localStorage.getItem(LS_SONGS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SongMetadata[];
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // Playlist data operations (localStorage)
  // ─────────────────────────────────────────────

  /** Saves all playlists metadata to localStorage */
  savePlaylistsData(playlists: PlaylistData[]): void {
    localStorage.setItem(LS_PLAYLISTS_KEY, JSON.stringify(playlists));
  }

  /** Loads all playlists metadata from localStorage */
  loadPlaylistsData(): PlaylistData[] {
    const raw = localStorage.getItem(LS_PLAYLISTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PlaylistData[];
    } catch {
      return [];
    }
  }

  /**
   * Restores a Song array from metadata + IndexedDB blobs.
   * Creates objectURL for each song that has a stored blob.
   */
  async restoreSongs(metadata: SongMetadata[]): Promise<Song[]> {
    const songs: Song[] = [];

    for (const meta of metadata) {
      const song = Song.fromJSON(meta);
      const blob = await this.getAudioBlob(meta.id);
      if (blob) {
        song.objectUrl = URL.createObjectURL(blob);
      }
      songs.push(song);
    }

    return songs;
  }

  /**
   * Cleans up object URLs and removes IndexedDB entries for songs
   * that are no longer present (orphan cleanup).
   */
  async cleanup(currentSongIds: Set<string>): Promise<void> {
    const stored = await this.getAllStoredIds();
    for (const id of stored) {
      if (!currentSongIds.has(id)) {
        await this.deleteAudioBlob(id);
      }
    }
  }
}
