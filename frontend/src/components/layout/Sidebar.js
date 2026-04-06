/**
 * components/layout/Sidebar.js — Sidebar Navigation
 *
 * WHAT: The persistent left sidebar with branding, nav links, and user info.
 *
 * HOW:  Uses NavLink from React Router for automatic active-state styling.
 *       Nav items are filtered by user role so reviewers see extra links.
 *       On mobile, the sidebar slides in from the left when sidebarOpen is true.
 *
 * WHY:  Sidebar-driven navigation is the standard pattern for SaaS dashboards —
 *       it keeps primary actions always visible without cluttering the content area.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ── SVG Icons (inline for zero dependency) ────────────────────────────────────
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Submit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7-7 7 7"/>
    </svg>
  ),
  History: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Reviewer: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Code: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',    Icon: Icons.Dashboard, roles: ['developer', 'reviewer'] },
  { to: '/submit',      label: 'Submit Code',  Icon: Icons.Submit,    roles: ['developer'] },
  { to: '/submissions', label: 'My Reviews',   Icon: Icons.History,   roles: ['developer'] },
  { to: '/reviewer',    label: 'All Reviews',  Icon: Icons.Reviewer,  roles: ['reviewer'] },
  { to: '/profile',     label: 'Profile',      Icon: Icons.Profile,   roles: ['developer', 'reviewer'] },
];

export default function Sidebar({ isOpen, isMobile, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user?.role || 'developer')
  );

  const sidebarStyle = {
    position: isMobile ? 'fixed' : 'sticky',
    top: 0,
    left: isMobile ? (isOpen ? 0 : '-280px') : 0,
    height: '100vh',
    width: 'var(--sidebar-width)',
    gridRow: isMobile ? 'auto' : '1 / 3',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflowY: 'auto',
  };

  return (
    <aside style={sidebarStyle} aria-label="Sidebar navigation">
      {/* Brand */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, var(--accent), #0066ff)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0,212,255,0.4)',
        }}>
          <Icons.Code />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            CodeLens
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            AI REVIEW
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: user?.role === 'reviewer' ? 'var(--purple-dim)' : 'var(--accent-dim)',
          color: user?.role === 'reviewer' ? 'var(--purple)' : 'var(--accent)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 10px',
          fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {user?.role || 'developer'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.style.background.includes('var(--accent-dim)')) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '0.8rem', color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            padding: 6, borderRadius: 6, display: 'flex',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Icons.Logout />
        </button>
      </div>
    </aside>
  );
}
