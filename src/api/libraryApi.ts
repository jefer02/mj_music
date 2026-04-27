import { apiClient } from "./apiClient";
import type { ApiLibrary } from "../types/api";

export const libraryApi = {
  /** Aggregate endpoint — loads songs, playlists, favorites and settings in one call */
  get: (): Promise<ApiLibrary> => apiClient.get<ApiLibrary>("/api/library"),
};
