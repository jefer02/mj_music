import type { ApiSong } from "./api";

export type TrackSourceType = "LOCAL" | "YOUTUBE";

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  sourceType: TrackSourceType;
  localFileName: string | null;
  localFileSize: number | null;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  /** URL to cover art — can be API URL or YouTube thumbnail */
  coverUrl: string | null;
  bitrateKbps: number | null;
  isHiRes: boolean;
  createdAt: string;
}

/** Maps an ApiSong from the backend to the frontend Song model */
export function mapApiSong(apiSong: ApiSong): Song {
  return {
    id: apiSong.id,
    title: apiSong.title,
    artist: apiSong.artist,
    duration: apiSong.duration,
    sourceType: apiSong.sourceType,
    localFileName: apiSong.localFileName,
    localFileSize: apiSong.localFileSize,
    youtubeUrl: apiSong.youtubeUrl,
    youtubeVideoId: apiSong.youtubeVideoId,
    coverUrl: apiSong.coverUrl,
    bitrateKbps: apiSong.bitrateKbps,
    isHiRes: apiSong.isHiRes,
    createdAt: apiSong.createdAt,
  };
}
