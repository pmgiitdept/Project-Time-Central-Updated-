// hooks/useSessionManager.jsx
import { useEffect, useState, useRef } from "react";
import api from "../api";
import * as jwt_decode from "jwt-decode";

export default function useSessionManager() {
  const [modalVisible, setModalVisible] = useState(false);
  const refreshInterval = useRef(null);
  const warningTimeout = useRef(null);

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

  const scheduleWarning = () => {
    const expTime = getTokenExpiry();
    if (!expTime) return;

    const now = Date.now();
    const timeLeft = expTime - now;
    if (timeLeft <= 0) {
      handleLogout();
      return;
    }

    const warningTime = Math.max(timeLeft - 60 * 1000, 0);

    clearTimeout(warningTimeout.current);
    warningTimeout.current = setTimeout(() => setModalVisible(true), warningTime);
  };

  const handleKeepLoggedIn = async () => {
    const success = await silentRefresh();
    if (success) {
      setModalVisible(false);
      scheduleWarning();
    } else {
      handleLogout();
    }
  };

  const handleLogout = () => {
    clearInterval(refreshInterval.current);
    clearTimeout(warningTimeout.current);
    localStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    scheduleWarning();

    refreshInterval.current = setInterval(async () => {
      const expTime = getTokenExpiry();
      if (!expTime) return;

      const now = Date.now();
      const timeLeft = expTime - now;

      if (timeLeft < 5 * 60 * 1000) {
        const success = await silentRefresh();
        if (success) {
          scheduleWarning(); 
        } else {
          setModalVisible(true); 
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