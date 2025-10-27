// hooks/useSessionManager.jsx
import { useEffect, useState, useRef } from "react";
import api from "../api";
import * as jwt_decode from "jwt-decode";

export default function useSessionManager() {
  const [modalVisible, setModalVisible] = useState(false);
  const refreshInterval = useRef(null);
  const warningTimeout = useRef(null);

  // 🔐 Decode and get expiration time
  const getTokenExpiry = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const decoded = jwt_decode.default(token);
      return decoded.exp * 1000;
    } catch {
      return null;
    }
  };

  // ♻️ Silent refresh
  const silentRefresh = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;

    try {
      const res = await api.post("auth/token/refresh/", { refresh });
      localStorage.setItem("access_token", res.data.access);
      console.log("✅ Access token refreshed silently");
      return true;
    } catch (err) {
      console.warn("❌ Silent refresh failed:", err);
      return false;
    }
  };

  // 🕐 Schedule token expiry warning modal
  const scheduleWarning = () => {
    const expTime = getTokenExpiry();
    if (!expTime) return;

    const now = Date.now();
    const timeLeft = expTime - now;
    if (timeLeft <= 0) {
      handleLogout();
      return;
    }

    // Show modal 1 min before expiry
    const warningTime = Math.max(timeLeft - 60 * 1000, 0);

    clearTimeout(warningTimeout.current);
    warningTimeout.current = setTimeout(() => setModalVisible(true), warningTime);
  };

  // 🔁 Keep user logged in manually
  const handleKeepLoggedIn = async () => {
    const success = await silentRefresh();
    if (success) {
      setModalVisible(false);
      scheduleWarning();
    } else {
      handleLogout();
    }
  };

  // 🚪 Log out user
  const handleLogout = () => {
    clearInterval(refreshInterval.current);
    clearTimeout(warningTimeout.current);
    localStorage.clear();
    window.location.href = "/login";
  };

  // 🚀 Initialize checks
  useEffect(() => {
    // Run once on mount
    scheduleWarning();

    // Silent refresh every 10 minutes (or configurable)
    refreshInterval.current = setInterval(async () => {
      const expTime = getTokenExpiry();
      if (!expTime) return;

      const now = Date.now();
      const timeLeft = expTime - now;

      // If expiring within 5 minutes, refresh early
      if (timeLeft < 5 * 60 * 1000) {
        const success = await silentRefresh();
        if (success) {
          scheduleWarning(); // reschedule after new token
        } else {
          setModalVisible(true); // show warning if refresh fails
        }
      }
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval.current);
      clearTimeout(warningTimeout.current);
    };
  }, []);

  return { modalVisible, handleKeepLoggedIn, handleLogout };
}
