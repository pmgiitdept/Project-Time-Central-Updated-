// src/api.jsx
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/";

const api = axios.create({
  baseURL,
  withCredentials: true, // ✅ add this for cookies/session support
});

// ✅ Log once during development
//console.log("API Base URL:", baseURL);

// 🔐 Automatically attach Authorization header for every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔁 Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (refresh) {
          const res = await axios.post(
            `${baseURL}token/refresh/`,
            { refresh },
            { headers: { "Content-Type": "application/json" } }
          );

          // ✅ Save new access token
          localStorage.setItem("access_token", res.data.access);

          // ✅ Update and retry the original request
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);

        // ❌ Remove only auth-related keys, not everything
        //localStorage.removeItem("access_token");
        //localStorage.removeItem("refresh_token");

        // ✅ Redirect gracefully only if not already on login
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
