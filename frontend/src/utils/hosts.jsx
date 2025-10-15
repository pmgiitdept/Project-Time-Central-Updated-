// src/utils/hosts.js

export function getApiBase() {
  return (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/").replace(/\/$/, "");
}

export function getWsBase() {
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
  return `${wsScheme}://${wsHost}`;
}