/**
 * context/AuthContext.js — Global Authentication State
 *
 * WHAT: React Context that holds the current user, token, and auth actions
 *       (login, logout, register). Makes auth state accessible app-wide without
 *       prop drilling.
 *
 * HOW:  On mount, reads the token from localStorage and fetches /api/auth/me to
 *       restore the session. login/register store the token and user in both
 *       state and localStorage. logout clears everything.
 *
 * WHY:  A single auth source of truth prevents stale state bugs and makes it
 *       trivial to add new protected pages — just consume the context.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cl_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('cl_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('cl_token');
        localStorage.removeItem('cl_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password, role) => {
    setError(null);
    const res = await api.post('/auth/register', { name, email, password, role });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('cl_token', newToken);
    localStorage.setItem('cl_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('cl_token', newToken);
    localStorage.setItem('cl_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('cl_token');
    localStorage.removeItem('cl_user');
    setToken(null);
    setUser(null);
  }, []);

  // ── Update local user state (after profile edit) ───────────────────────────
  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('cl_user', JSON.stringify(updatedUser));
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    isReviewer: user?.role === 'reviewer',
    register,
    login,
    logout,
    updateUser,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
