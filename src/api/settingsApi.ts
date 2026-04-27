import { apiClient } from "./apiClient";
import type { ApiSettings } from "../types/api";

export const settingsApi = {
  get: (): Promise<ApiSettings> => apiClient.get<ApiSettings>("/api/settings"),

  patch: (data: Partial<ApiSettings>): Promise<ApiSettings> =>
    apiClient.patch<ApiSettings>("/api/settings", data),
};
