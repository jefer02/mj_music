// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  expiresIn?: number;
}

// ── Songs ─────────────────────────────────────────────────────────────────────

export interface ApiSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  sourceType: "LOCAL" | "YOUTUBE";
  localFileName: string | null;
  localFileSize: number | null;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  coverUrl: string | null;
  bitrateKbps: number | null;
  isHiRes: boolean;
  createdAt: string;
}

export interface CreateYouTubeSongRequest {
  url: string;
  title: string;
  artist: string;
}

// ── Playlists ─────────────────────────────────────────────────────────────────

export interface ApiPlaylist {
  id: string;
  name: string;
  songIds: string[];
  isSystem: boolean;
}

export interface CreatePlaylistRequest {
  name: string;
  songIds: string[];
}

export interface PatchPlaylistRequest {
  name?: string;
}

export interface AddSongsToPlaylistRequest {
  songIds: string[];
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface ApiSettings {
  volume: number;
  isLoopEnabled: boolean;
  isShuffleEnabled: boolean;
}

// ── Library (aggregate load) ──────────────────────────────────────────────────

export interface ApiLibrary {
  songs: ApiSong[];
  playlists: ApiPlaylist[];
  favorites: string[];
  settings: ApiSettings;
}
