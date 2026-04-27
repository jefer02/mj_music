import { apiClient } from "./apiClient";
import type {
  ApiPlaylist,
  AddSongsToPlaylistRequest,
  CreatePlaylistRequest,
  PatchPlaylistRequest,
} from "../types/api";

export const playlistsApi = {
  getAll: (): Promise<ApiPlaylist[]> => apiClient.get<ApiPlaylist[]>("/api/playlists"),

  create: (data: CreatePlaylistRequest): Promise<ApiPlaylist> =>
    apiClient.post<ApiPlaylist>("/api/playlists", data),

  patch: (id: string, data: PatchPlaylistRequest): Promise<ApiPlaylist> =>
    apiClient.patch<ApiPlaylist>(`/api/playlists/${id}`, data),

  addSongs: (id: string, songIds: string[]): Promise<ApiPlaylist> => {
    const body: AddSongsToPlaylistRequest = { songIds };
    return apiClient.post<ApiPlaylist>(`/api/playlists/${id}/songs`, body);
  },

  removeSong: (playlistId: string, songId: string): Promise<void> =>
    apiClient.delete<void>(`/api/playlists/${playlistId}/songs/${songId}`),

  delete: (id: string): Promise<void> => apiClient.delete<void>(`/api/playlists/${id}`),
};
