/**
 * pages/NotFoundPage.js — 404 Page
 *
 * WHAT: Renders a styled 404 error page for any unmatched route.
 *
 * HOW:  Simple static page with navigation links back to safety.
 *       Standalone (no AppLayout wrapper) to avoid broken nav when route is unknown.
 *
 * WHY:  A good 404 page reduces user frustration and provides a clear exit path
 *       back to the app, reducing bounce rate from broken or mistyped URLs.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 24,
      padding: 24,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ animation: 'fadeInUp 0.5s ease' }}>
        {/* Big 404 */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(6rem, 20vw, 12rem)',
          fontWeight: 900,
          lineHeight: 1,
          background: 'linear-gradient(135deg, var(--border) 0%, var(--bg-overlay) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.05em',
          marginBottom: 8,
        }}>
          404
        </div>

        {/* Mono label */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--accent)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}>
          Error: Page Not Found
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          color: 'var(--text-primary)',
          marginBottom: 10,
        }}>
          This page doesn't exist
        </h2>

        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          maxWidth: 360,
          lineHeight: 1.7,
          margin: '0 auto 32px',
        }}>
          The route you requested could not be found. It may have been moved,
          deleted, or you may have mistyped the URL.
        </p>

        {/* Code block style error */}
        <div style={{
          display: 'inline-block',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 20px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginBottom: 32,
          textAlign: 'left',
        }}>
          <span style={{ color: 'var(--red)' }}>ERROR</span>
          <span style={{ color: 'var(--text-muted)' }}> at </span>
          <span style={{ color: 'var(--accent)' }}>router</span>
          <span style={{ color: 'var(--text-muted)' }}>: No route matches </span>
          <span style={{ color: 'var(--yellow)' }}>"{window.location.pathname}"</span>
        </div>

        {/* Navigation options */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, var(--accent), #0066ff)',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              padding: '12px 24px', borderRadius: 12,
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(0,212,255,0.3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(0,212,255,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.3)'; }}
          >
            🏠 Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem',
              padding: '12px 24px', borderRadius: 12,
              border: '1px solid var(--border)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-glow)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
