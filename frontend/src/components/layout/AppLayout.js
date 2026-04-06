/**
 * components/layout/AppLayout.js — Main Application Shell
 *
 * WHAT: The persistent shell rendered around all authenticated pages.
 *       Contains the sidebar navigation and the top navbar.
 *
 * HOW:  Uses CSS Grid with a fixed sidebar column and a scrollable main area.
 *       React Router's <Outlet /> renders the active page inside the main area.
 *       On mobile (<768px), the sidebar collapses and a hamburger toggle shows.
 *
 * WHY:  A shared layout component prevents duplicating nav markup across pages
 *       and provides a consistent chrome around every authenticated view.
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const styles = {
  shell: {
    display: 'grid',
    gridTemplateColumns: 'var(--sidebar-width) 1fr',
    gridTemplateRows: 'var(--navbar-height) 1fr',
    minHeight: '100vh',
    background: 'var(--bg-base)',
  },
  main: {
    gridColumn: '2',
    gridRow: '2',
    overflow: 'auto',
    padding: '32px',
    background: 'var(--bg-base)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 50,
    backdropFilter: 'blur(4px)',
  },
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const shellStyle = isMobile
    ? { ...styles.shell, gridTemplateColumns: '1fr' }
    : styles.shell;

  const mainStyle = isMobile
    ? { ...styles.main, gridColumn: '1', padding: '20px 16px' }
    : styles.main;

  return (
    <div style={shellStyle}>
      {/* Sidebar */}
      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Top Navbar */}
      <Navbar
        onMenuClick={() => setSidebarOpen((o) => !o)}
        isMobile={isMobile}
      />

      {/* Page content */}
      <main style={mainStyle} className="page-enter">
        <Outlet />
      </main>
    </div>
  );
}
