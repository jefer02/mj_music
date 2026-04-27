import { apiClient } from "./apiClient";
import type { ApiSong, CreateYouTubeSongRequest } from "../types/api";

export const songsApi = {
  getAll: (): Promise<ApiSong[]> => apiClient.get<ApiSong[]>("/api/songs"),

  getById: (id: string): Promise<ApiSong> => apiClient.get<ApiSong>(`/api/songs/${id}`),

  upload: (file: File): Promise<ApiSong> => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm<ApiSong>("/api/songs/upload", form);
  },

  addYouTube: (data: CreateYouTubeSongRequest): Promise<ApiSong> =>
    apiClient.post<ApiSong>("/api/songs/youtube", data),

  delete: (id: string): Promise<void> => apiClient.delete<void>(`/api/songs/${id}`),
};
