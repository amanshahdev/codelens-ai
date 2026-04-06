/**
 * pages/ProfilePage.js — User Profile
 *
 * WHAT: Shows the current user's profile, stats, and lets them update their
 *       name, bio, and password.
 *
 * HOW:  Fetches /api/users/me/profile for full profile data.
 *       PUT /api/auth/profile for name/bio updates.
 *       PUT /api/auth/password for password change.
 *
 * WHY:  Users need a settings page to personalise their experience and maintain
 *       account security. Keeping it in one place reduces cognitive overhead.
 */

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Alert, StatCard, Badge } from '../components/ui';
import { Link } from 'react-router-dom';

const gradeColor = (g) => ({ A: 'var(--green)', B: 'var(--accent)', C: 'var(--yellow)', D: 'var(--orange)', F: 'var(--red)' }[g] || 'var(--text-muted)');
const LANG_COLORS = { javascript: '#f7df1e', python: '#3776ab', java: '#ed8b00', typescript: '#3178c6', go: '#00add8', rust: '#ce4a00', cpp: '#00599c', other: '#8888aa' };

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [recentSubs, setRecentSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({ name: '', bio: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users/me/profile');
        setProfile(res.data.user);
        setRecentSubs(res.data.recentSubmissions || []);
        setProfileForm({ name: res.data.user.name, bio: res.data.user.bio || '' });
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await api.put('/auth/profile', profileForm);
      updateUser(res.data.user);
      setProfile(res.data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });
    if (pwForm.newPassword !== pwForm.confirmNew) {
      return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed.' });
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return null;

  const initials = profile?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', animation: 'fadeInUp 0.4s ease' }}>
      <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: 24 }}>Profile</h1>

      {/* Avatar + stats header */}
      <Card style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem',
            color: '#fff', flexShrink: 0, boxShadow: '0 0 24px rgba(102,126,234,0.4)',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
              {profile?.name}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 8 }}>{profile?.email}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Badge label={profile?.role || 'developer'} variant={profile?.role === 'reviewer' ? 'purple' : 'accent'} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Member since {new Date(profile?.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            {profile?.bio && <p style={{ marginTop: 10, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{profile.bio}</p>}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Submissions" value={profile?.stats?.totalSubmissions || 0} icon="📤" color="var(--accent)" />
        <StatCard label="Average Score" value={`${profile?.stats?.avgScore || 0}`} icon="⭐" color="var(--yellow)" />
      </div>

      {/* Recent submissions */}
      {recentSubs.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={sectionTitle}>Recent Submissions</h3>
            <Link to="/submissions" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSubs.map((sub) => (
              <Link key={sub._id} to={`/analysis/${sub._id}`} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg-elevated)', textDecoration: 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[sub.language] || '#8888aa', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.title}
                </span>
                <Badge label={sub.status} variant={sub.status} />
                {sub.analysis?.overallScore != null && (
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: gradeColor(sub.analysis.grade) }}>
                    {sub.analysis.overallScore}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Edit profile */}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={sectionTitle}>Edit Profile</h3>
        <Alert type={profileMsg.type || 'info'} message={profileMsg.text} onClose={() => setProfileMsg({ type: '', text: '' })} />
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>DISPLAY NAME</label>
            <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>BIO (optional)</label>
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              rows={3} placeholder="Tell others about yourself…" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={profileLoading} size="sm">Save Profile</Button>
          </div>
        </form>
      </Card>

      {/* Change password */}
      <Card>
        <h3 style={sectionTitle}>Change Password</h3>
        <Alert type={pwMsg.type || 'info'} message={pwMsg.text} onClose={() => setPwMsg({ type: '', text: '' })} />
        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>CURRENT PASSWORD</label>
            <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={pwForm.confirmNew} onChange={(e) => setPwForm({ ...pwForm, confirmNew: e.target.value })} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={pwLoading} size="sm" variant="secondary">Change Password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const sectionTitle = {
  fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)',
  letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
  marginBottom: 16,
};

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700,
  color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-mono)',
};
