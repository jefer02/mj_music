export type TrackSourceType = "LOCAL" | "YOUTUBE";

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  sourceType: TrackSourceType;
  localObjectUrl: string | null;
  localFileName: string;
  localFileSize: number;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  coverDataUrl: string | null;
  bitrateKbps: number | null;
  isHiRes: boolean;
  createdAt: number;
}

export type PersistedSong = Omit<Song, "localObjectUrl">;
