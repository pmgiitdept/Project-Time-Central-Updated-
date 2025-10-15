import { useEffect, useState } from "react";
import api from "../api"; // your axios instance
import * as jwt_decode from "jwt-decode";

export default function useTokenExpiration() {
  const [modalVisible, setModalVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const scheduleTokenCheck = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const decoded = jwt_decode.default(token);
      const exp = decoded.exp * 1000; // convert to ms
      const now = Date.now();
      const msBeforeExpiry = exp - now;

      if (msBeforeExpiry <= 0) {
        handleLogout();
        return;
      }

      const warningTime = msBeforeExpiry - 60 * 1000;

      const id = setTimeout(() => setModalVisible(true), warningTime > 0 ? warningTime : 0);
      setTimeoutId(id);
    } catch (err) {
      console.error("Invalid token", err);
      handleLogout();
    }
  };

  const handleKeepLoggedIn = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) throw new Error("No refresh token found");

      const res = await api.post("/token/refresh/", { refresh });
      localStorage.setItem("access_token", res.data.access);
      setModalVisible(false);

      // reschedule next check
      scheduleTokenCheck();
    } catch (err) {
      console.error("Failed to refresh token", err);
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    scheduleTokenCheck();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return { modalVisible, handleKeepLoggedIn, handleLogout };
}
