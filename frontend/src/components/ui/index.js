/**
 * components/ui/index.js — Shared UI Primitives
 *
 * WHAT: Reusable, design-token-aware components used across all pages.
 *       Includes Card, Button, Badge, ProgressBar, Spinner, EmptyState, Alert.
 *
 * HOW:  Each component accepts style overrides via props. They all reference
 *       CSS custom properties so they automatically pick up theme changes.
 *
 * WHY:  A shared component library ensures visual consistency and lets us
 *       update the design in one place without hunting through every page file.
 */

import React from 'react';

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, className = '', hover = false, glow = false }) => (
  <div
    className={className}
    style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-card)',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      ...(glow && { boxShadow: 'var(--shadow-card), 0 0 24px var(--accent-glow)' }),
      ...style,
    }}
    onMouseEnter={hover ? (e) => {
      e.currentTarget.style.borderColor = 'var(--border-glow)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    } : undefined}
    onMouseLeave={hover ? (e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.transform = 'none';
    } : undefined}
  >
    {children}
  </div>
);

// ── Button ────────────────────────────────────────────────────────────────────
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  style = {},
  fullWidth = false,
}) => {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--accent), #0066ff)',
      color: '#fff',
      border: 'none',
      boxShadow: '0 0 20px rgba(0,212,255,0.2)',
    },
    secondary: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    danger: {
      background: 'var(--red-dim)',
      color: 'var(--red)',
      border: '1px solid rgba(255,77,109,0.3)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
    success: {
      background: 'var(--green-dim)',
      color: 'var(--green)',
      border: '1px solid rgba(0,229,160,0.3)',
    },
  };

  const sizes = {
    sm: { padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' },
    md: { padding: '10px 22px', fontSize: '0.875rem', borderRadius: '10px' },
    lg: { padding: '14px 30px', fontSize: '1rem', borderRadius: '12px' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'var(--font-body)',
        width: fullWidth ? '100%' : 'auto',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          if (variant === 'primary') e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,212,255,0.4)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        if (variant === 'primary') e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.2)';
      }}
    >
      {loading ? <Spinner size={14} color="currentColor" /> : null}
      {children}
    </button>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ label, variant = 'default', style = {} }) => {
  const variants = {
    default:    { background: 'var(--bg-overlay)',  color: 'var(--text-secondary)' },
    accent:     { background: 'var(--accent-dim)',  color: 'var(--accent)' },
    success:    { background: 'var(--green-dim)',   color: 'var(--green)' },
    warning:    { background: 'var(--yellow-dim)',  color: 'var(--yellow)' },
    danger:     { background: 'var(--red-dim)',     color: 'var(--red)' },
    info:       { background: 'var(--accent-dim)',  color: 'var(--accent)' },
    purple:     { background: 'var(--purple-dim)',  color: 'var(--purple)' },
    pending:    { background: 'var(--yellow-dim)',  color: 'var(--yellow)' },
    analyzing:  { background: 'var(--accent-dim)',  color: 'var(--accent)' },
    completed:  { background: 'var(--green-dim)',   color: 'var(--green)' },
    failed:     { background: 'var(--red-dim)',     color: 'var(--red)' },
    critical:   { background: 'var(--red-dim)',     color: 'var(--red)' },
    warning2:   { background: 'var(--yellow-dim)',  color: 'var(--yellow)' },
    suggestion: { background: 'var(--purple-dim)',  color: 'var(--purple)' },
  };
  const v = variants[variant] || variants.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.7rem', fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.04em', textTransform: 'uppercase',
      ...v, ...style,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {label}
    </span>
  );
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
export const ProgressBar = ({ value = 0, max = 100, label, color, showValue = true, height = 8 }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const getColor = (v) => {
    if (color) return color;
    if (v >= 80) return 'var(--green)';
    if (v >= 60) return 'var(--accent)';
    if (v >= 40) return 'var(--yellow)';
    return 'var(--red)';
  };

  const barColor = getColor(pct);

  return (
    <div style={{ width: '100%' }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>}
          {showValue && <span style={{ fontSize: '0.78rem', color: barColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{Math.round(pct)}</span>}
        </div>
      )}
      <div style={{
        height, width: '100%',
        background: 'var(--bg-overlay)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${barColor}66`,
        }} />
      </div>
    </div>
  );
};

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 24, color = 'var(--accent)' }) => (
  <div style={{
    width: size, height: size,
    border: `${Math.max(2, size / 10)}px solid var(--border)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  }} aria-label="Loading" />
);

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
    animation: 'fadeIn 0.4s ease',
  }}>
    <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>{icon}</div>
    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h3>
    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6, marginBottom: action ? 24 : 0 }}>
      {description}
    </p>
    {action}
  </div>
);

// ── Alert ─────────────────────────────────────────────────────────────────────
export const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const types = {
    info:    { bg: 'var(--accent-dim)',  color: 'var(--accent)',  icon: 'ℹ️' },
    success: { bg: 'var(--green-dim)',   color: 'var(--green)',   icon: '✅' },
    warning: { bg: 'var(--yellow-dim)',  color: 'var(--yellow)',  icon: '⚠️' },
    error:   { bg: 'var(--red-dim)',     color: 'var(--red)',     icon: '❌' },
  };
  const t = types[type] || types.info;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 16px',
      background: t.bg,
      border: `1px solid ${t.color}33`,
      borderRadius: 'var(--radius-md)',
      fontSize: '0.875rem', color: t.color,
      marginBottom: 16,
      animation: 'fadeIn 0.3s ease',
    }}>
      <span>{t.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.color, cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>
          ×
        </button>
      )}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon, color = 'var(--accent)', delay = 0 }) => (
  <Card
    hover
    className="animate-fade-in-up"
    style={{ animationDelay: `${delay}s` }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
      </div>
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem',
        }}>
          {icon}
        </div>
      )}
    </div>
  </Card>
);
