export const LIBRARY_PLAYLIST_ID = "library";
export const FAVORITES_PLAYLIST_ID = "favorites";

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isSystem: boolean;
}

export type PlaylistKind = "LIBRARY" | "FAVORITES" | "CUSTOM";
