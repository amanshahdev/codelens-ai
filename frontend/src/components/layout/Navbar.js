/**
 * components/layout/Navbar.js — Top Navigation Bar
 *
 * WHAT: Sticky top bar showing current page title, a breadcrumb path, and
 *       quick action buttons (submit code shortcut, notifications placeholder).
 *
 * HOW:  Reads the current route from useLocation() to derive the page title.
 *       On mobile it shows a hamburger menu button that calls onMenuClick.
 *
 * WHY:  A consistent top bar gives users orientation and quick access to the
 *       most common action (submit code) from anywhere in the app.
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROUTE_LABELS = {
  '/dashboard':   'Dashboard',
  '/submit':      'Submit Code',
  '/submissions': 'My Reviews',
  '/reviewer':    'All Submissions',
  '/profile':     'Profile',
};

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export default function Navbar({ onMenuClick, isMobile }) {
  const location = useLocation();
  const { user } = useAuth();

  const pageLabel = Object.entries(ROUTE_LABELS).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'CodeLens AI';

  return (
    <header style={{
      gridColumn: isMobile ? '1' : '2',
      gridRow: '1',
      height: 'var(--navbar-height)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={onMenuClick}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            padding: 6, borderRadius: 6, display: 'flex',
          }}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
      )}

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          {pageLabel}
        </h2>
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {location.pathname}
        </div>
      </div>

      {/* Avg score pill */}
      {user?.stats?.avgScore > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 12px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          Avg score:&nbsp;
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
            {user.stats.avgScore}
          </span>
        </div>
      )}

      {/* Submit CTA */}
      {!isMobile && user?.role !== 'reviewer' && location.pathname !== '/submit' && (
        <Link
          to="/submit"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'linear-gradient(135deg, var(--accent), #0066ff)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            boxShadow: '0 0 12px rgba(0,212,255,0.25)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,212,255,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,255,0.25)'; }}
        >
          <PlusIcon />
          Submit Code
        </Link>
      )}
    </header>
  );
}
