/**
 * pages/RegisterPage.js — Registration Screen
 *
 * WHAT: Public signup page. Collects name, email, password, and role selection.
 *
 * HOW:  Calls AuthContext.register() → POST /api/auth/register.
 *       Role selector lets the user choose Developer or Reviewer at signup.
 *
 * WHY:  Role selection at registration time avoids an extra profile-setup step
 *       and immediately shows the correct dashboard view after signup.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Alert } from '../components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'developer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'developer', label: '👨‍💻 Developer', desc: 'Submit code for AI review' },
    { value: 'reviewer',  label: '🔍 Reviewer',  desc: 'View all submissions platform-wide' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -200, left: -200,
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 460, animation: 'fadeInUp 0.5s ease' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 6,
          }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Start reviewing code with AI in seconds
          </p>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <Alert type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7, letterSpacing: '0.03em' }}>
                FULL NAME
              </label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7, letterSpacing: '0.03em' }}>
                EMAIL ADDRESS
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7, letterSpacing: '0.03em' }}>
                PASSWORD
              </label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7, letterSpacing: '0.03em' }}>
                CONFIRM PASSWORD
              </label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" required />
            </div>

            {/* Role selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.03em' }}>
                I AM A…
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {roleOptions.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, role: value })}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: form.role === value ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                      background: form.role === value ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: form.role === value ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 3 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: 6 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <div style={{
            marginTop: 24, paddingTop: 24,
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.875rem', color: 'var(--text-muted)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
