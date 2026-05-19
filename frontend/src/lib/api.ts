import axios from "axios";
import { useAuthStore } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing ??= refreshToken();
      const token = await refreshing.finally(() => (refreshing = null));
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

async function refreshToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      (import.meta.env.VITE_API_URL || "/api/v1") + "/auth/refresh",
      {},
      { withCredentials: true },
    );
    useAuthStore.getState().setSession(res.data.accessToken, res.data.user);
    return res.data.accessToken as string;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}
