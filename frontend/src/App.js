/**
 * src/App.js — Root Component & Router
 *
 * WHAT: Top-level component that sets up React Router v6 routes, wraps the app
 *       in AuthProvider, and renders the appropriate layout (public vs protected).
 *
 * HOW:  ProtectedRoute checks isAuthenticated from AuthContext; if false it
 *       redirects to /login. PublicRoute redirects authenticated users away
 *       from login/register to the dashboard.
 *
 * WHY:  Centralising routing here gives a complete picture of all pages at a
 *       glance and ensures consistent layout wrapping.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SubmitCodePage from './pages/SubmitCodePage';
import SubmissionsPage from './pages/SubmissionsPage';
import AnalysisPage from './pages/AnalysisPage';
import ProfilePage from './pages/ProfilePage';
import ReviewerPage from './pages/ReviewerPage';
import NotFoundPage from './pages/NotFoundPage';

// ── Route Guards ──────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children, reviewerOnly = false }) => {
  const { isAuthenticated, loading, isReviewer } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (reviewerOnly && !isReviewer) return <Navigate to="/dashboard" replace />;

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

// ── App Routes ────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected — wrapped in AppLayout (sidebar + navbar) */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<DashboardPage />} />
        <Route path="submit"      element={<SubmitCodePage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="analysis/:submissionId" element={<AnalysisPage />} />
        <Route path="profile"     element={<ProfilePage />} />
        <Route path="reviewer"    element={
          <ProtectedRoute reviewerOnly>
            <ReviewerPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Noise grain texture overlay */}
        <div className="noise-overlay" aria-hidden="true" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
