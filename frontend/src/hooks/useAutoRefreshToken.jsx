// src/hooks/useAutoRefreshToken.jsx
import { useEffect } from "react";
import api from "../api";

export default function useAutoRefreshToken() {
  useEffect(() => {
    const interval = setInterval(async () => {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await api.post("auth/token/refresh/", { refresh });
          localStorage.setItem("access_token", res.data.access);
          console.log("✅ Access token refreshed silently");
        } catch (err) {
          console.warn("❌ Silent refresh failed:", err);
        }
      }
    }, 10 * 60 * 1000); // every 10 minutes (adjustable)

    return () => clearInterval(interval);
  }, []);
}
