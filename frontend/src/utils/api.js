/**
 * utils/api.js — Centralised Axios Instance
 *
 * WHAT: A pre-configured Axios instance that every API call in the app uses.
 *
 * HOW:  Sets the base URL from REACT_APP_API_URL (falls back to /api for the
 *       CRA proxy). A request interceptor attaches the JWT from localStorage to
 *       every outgoing request. A response interceptor handles 401 responses by
 *       clearing auth state and redirecting to /login.
 *
 * WHY:  Centralising Axios config prevents repetition of base URL and auth
 *       header setup across dozens of component files.
 */

import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://codelens-ai-ia0s.onrender.com/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cl_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      localStorage.removeItem("cl_token");
      localStorage.removeItem("cl_user");
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
