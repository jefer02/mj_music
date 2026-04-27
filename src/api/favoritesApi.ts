import { apiClient } from "./apiClient";

export const favoritesApi = {
  getAll: (): Promise<string[]> => apiClient.get<string[]>("/api/favorites"),

  add: (songId: string): Promise<void> =>
    apiClient.post<void>(`/api/favorites/${songId}`),

  remove: (songId: string): Promise<void> =>
    apiClient.delete<void>(`/api/favorites/${songId}`),
};
