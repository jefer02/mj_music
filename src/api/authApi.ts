import { apiClient, setToken, clearToken } from "./apiClient";
import type { AuthResponse, LoginRequest, RegisterRequest } from "../types/api";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/api/auth/login", credentials);
    setToken(response.token);
    return response;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/api/auth/register", data);
    setToken(response.token);
    return response;
  },

  logout: (): void => {
    clearToken();
  },
};
