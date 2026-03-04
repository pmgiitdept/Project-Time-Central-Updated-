// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode"; 

export const AuthContext = createContext();

let authInitialized = false;

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  });

  const [loading, setLoading] = useState(false); 

  const getTokenExpiry = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000;
    } catch (err) {
      console.warn("❌ Failed to decode token:", err);
      return null;
    }
  };

  const silentRefresh = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) {
      console.warn("No refresh token found");
      return false;
    }

    try {
      const res = await api.post("auth/token/refresh/", { refresh }); 
      localStorage.setItem("access_token", res.data.access);

      api.defaults.headers.common["Authorization"] = `Bearer ${res.data.access}`;

      console.log("✅ Token silently refreshed (AuthContext)");
      return true;
    } catch (err) {
      console.warn("❌ Silent refresh failed (AuthContext):", err);
      return false;
    }
  };

  useEffect(() => {
    if (authInitialized) return;
    authInitialized = true;

    const controller = new AbortController();
    let isMounted = true;

    const checkAuth = async () => {
      // console.log("🔹 Running AuthContext checkAuth...");
      const access = localStorage.getItem("access_token");

      if (!access) {
        console.log("⚠️ No access token found");
        if (isMounted) setCurrentUser(null);
        return;
      }

      const exp = getTokenExpiry();
      const now = Date.now();

      if (exp && exp <= now) {
        console.log("⚠️ Access token expired, trying silent refresh...");
        const refreshed = await silentRefresh();
        if (!refreshed) {
          localStorage.clear();
          if (isMounted) setCurrentUser(null);
          return;
        }
      }

      try {
        //console.log("🌐 Checking user at /auth/me/");
        const res = await api.get("auth/me/");
        //console.log("✅ Auth verified, user:", res.data);
        if (isMounted) {
          setCurrentUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch (err) {
        if (err.name === "CanceledError") {
          console.warn("⚠️ Request canceled, skipping cleanup");
          return;
        }
        console.warn("❌ Auth check failed:", err);
        if (err.response?.status === 401) localStorage.clear();
        if (isMounted) setCurrentUser(null);
      } finally {
        //console.log("🔹 AuthContext check complete");
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
