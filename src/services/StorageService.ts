import type { Playlist } from "../types/playlist";
import type { PersistedSong, Song } from "../types/song";

const DB_NAME = "MJMusicReactDB";
const DB_VERSION = 1;
const AUDIO_STORE = "audio_blobs";

const LS_STATE_KEY = "mjmusic_react_state";

export interface PersistedPlayerSettings {
  volume: number;
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
}

export interface PersistedAppState {
  songs: PersistedSong[];
  playlists: Playlist[];
  settings: PersistedPlayerSettings;
}

const DEFAULT_SETTINGS: PersistedPlayerSettings = {
  volume: 0.8,
  isLoopEnabled: false,
  isShuffleEnabled: false,
};

export class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(AUDIO_STORE)) {
          database.createObjectStore(AUDIO_STORE);
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB init failed"));
      };
    });
  }

  async saveAudioBlob(songId: string, blob: Blob): Promise<void> {
    if (!this.db) {
      throw new Error("IndexedDB is not initialized");
    }

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readwrite");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.put(blob, songId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not save audio blob"));
    });
  }

  async getAudioBlob(songId: string): Promise<Blob | null> {
    if (!this.db) {
      throw new Error("IndexedDB is not initialized");
    }

    return new Promise<Blob | null>((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.get(songId);

      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read audio blob"));
    });
  }

  async deleteAudioBlob(songId: string): Promise<void> {
    if (!this.db) {
      throw new Error("IndexedDB is not initialized");
    }

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readwrite");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.delete(songId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not delete audio blob"));
    });
  }

  async getAllAudioBlobIds(): Promise<string[]> {
    if (!this.db) {
      return [];
    }

    return new Promise<string[]>((resolve, reject) => {
      const tx = this.db!.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve((request.result as string[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Could not list audio blobs"));
    });
  }

  saveAppState(nextState: { songs: Song[]; playlists: Playlist[]; settings: PersistedPlayerSettings }): void {
    const payload: PersistedAppState = {
      songs: nextState.songs.map((song) => this.toPersistedSong(song)),
      playlists: nextState.playlists,
      settings: nextState.settings,
    };

    localStorage.setItem(LS_STATE_KEY, JSON.stringify(payload));
  }

  loadAppState(): PersistedAppState {
    const raw = localStorage.getItem(LS_STATE_KEY);
    if (!raw) {
      return {
        songs: [],
        playlists: [],
        settings: DEFAULT_SETTINGS,
      };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedAppState>;

      return {
        songs: Array.isArray(parsed.songs) ? (parsed.songs as PersistedSong[]) : [],
        playlists: Array.isArray(parsed.playlists) ? (parsed.playlists as Playlist[]) : [],
        settings: {
          volume: parsed.settings?.volume ?? DEFAULT_SETTINGS.volume,
          isLoopEnabled: parsed.settings?.isLoopEnabled ?? DEFAULT_SETTINGS.isLoopEnabled,
          isShuffleEnabled: parsed.settings?.isShuffleEnabled ?? DEFAULT_SETTINGS.isShuffleEnabled,
        },
      };
    } catch {
      return {
        songs: [],
        playlists: [],
        settings: DEFAULT_SETTINGS,
      };
    }
  }

  async restoreSongs(persistedSongs: PersistedSong[]): Promise<Song[]> {
    const restored: Song[] = [];

    for (const song of persistedSongs) {
      if (song.sourceType === "LOCAL") {
        const blob = await this.getAudioBlob(song.id);
        const objectUrl = blob ? URL.createObjectURL(blob) : null;
        restored.push({
          ...song,
          localObjectUrl: objectUrl,
        });
        continue;
      }

      restored.push({
        ...song,
        localObjectUrl: null,
      });
    }

    return restored;
  }

  async cleanupOrphanAudio(localSongIds: Set<string>): Promise<void> {
    const storedIds = await this.getAllAudioBlobIds();

    for (const id of storedIds) {
      if (!localSongIds.has(id)) {
        await this.deleteAudioBlob(id);
      }
    }
  }

  private toPersistedSong(song: Song): PersistedSong {
    const { localObjectUrl: _, ...rest } = song;
    return rest;
  }
}
