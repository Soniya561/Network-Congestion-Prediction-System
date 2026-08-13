import axios from "axios";

const resolveBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  const fallbackUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
  if (!configuredUrl) return fallbackUrl;

  try {
    const apiUrl = new URL(configuredUrl);
    const pageHost = window.location.hostname;
    const isLoopbackApi = apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost";
    const isLoopbackPage = pageHost === "127.0.0.1" || pageHost === "localhost";

    if (isLoopbackApi && isLoopbackPage && apiUrl.hostname !== pageHost) {
      apiUrl.hostname = pageHost;
      return apiUrl.toString().replace(/\/$/, "");
    }
  } catch {
    return fallbackUrl;
  }

  return configuredUrl;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
});

export default api;
