import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cake_admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cake_admin_token");
      localStorage.removeItem("cake_admin_user");

      if (
        window.location.pathname.startsWith("/admin") &&
        window.location.pathname !== "/admin/login"
      ) {
        window.location.href = "/admin/login";
      }
    }

    return Promise.reject(error);
  }
);

export function getImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || "";
  const backendBase = apiBase.replace(/\/api$/, "");
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanUrl}`;
}

export default api;
