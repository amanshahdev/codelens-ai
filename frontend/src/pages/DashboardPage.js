/**
 * pages/DashboardPage.js — Main Dashboard
 *
 * WHAT: The home screen for authenticated users. Shows KPI stat cards,
 *       a score-over-time sparkline, category radar, and recent submissions.
 *
 * HOW:  Fetches /api/analysis/user/stats and /api/code on mount.
 *       Uses Recharts for the score history line chart.
 *       Refreshes analysis status every 5 seconds if any submission is pending/analyzing.
 *
 * WHY:  The dashboard is the primary feedback loop — users need to see
 *       their progress at a glance without navigating to individual results.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Badge, ProgressBar, Spinner, EmptyState, Button } from '../components/ui';

const LANG_COLORS = {
  javascript: '#f7df1e', python: '#3776ab', java: '#ed8b00',
  typescript: '#3178c6', go: '#00add8', rust: '#ce4a00',
  cpp: '#00599c', other: '#8888aa',
};

const scoreColor = (value) => {
  const v = Number(value) || 0;
  if (v >= 80) return 'var(--green)';
  if (v >= 60) return 'var(--accent)';
  if (v >= 40) return 'var(--yellow)';
  return 'var(--red)';
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, subRes] = await Promise.all([
        api.get('/analysis/user/stats'),
        api.get('/code?limit=5'),
      ]);
      setStats(statsRes.data.stats);
      setSubmissions(subRes.data.submissions || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll if any submission is still pending/analyzing
  useEffect(() => {
    const hasPending = submissions.some(
      (s) => s.status === 'pending' || s.status === 'analyzing'
    );
    if (!hasPending) return;
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [submissions, fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <Spinner size={40} />
      </div>
    );
  }

  const radarData = stats ? [
    { subject: 'Quality',       A: stats.avgCategories?.codeQuality || 0 },
    { subject: 'Security',      A: stats.avgCategories?.security || 0 },
    { subject: 'Performance',   A: stats.avgCategories?.performance || 0 },
    { subject: 'Maintainability', A: stats.avgCategories?.maintainability || 0 },
    { subject: 'Best Practices', A: stats.avgCategories?.bestPractices || 0 },
  ] : [];

  const gradeColor = (g) => ({
    A: 'var(--green)', B: 'var(--accent)',
    C: 'var(--yellow)', D: 'var(--orange)', F: 'var(--red)',
  }[g] || 'var(--text-muted)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Welcome header */}
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <h1 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {stats?.totalSubmissions > 0
            ? `You've made ${stats.totalSubmissions} submission${stats.totalSubmissions !== 1 ? 's' : ''} with an average score of ${stats.avgScore}/100.`
            : 'Submit your first code snippet to get an AI-powered review.'}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label="Total Submissions"  value={stats?.totalSubmissions || 0}  icon="📤" color="var(--accent)"  delay={0} />
        <StatCard label="Average Score"      value={`${stats?.avgScore || 0}/100`}  icon="⭐" color="var(--yellow)" delay={0.05} />
        <StatCard label="Highest Score"      value={`${stats?.highestScore || 0}`}  icon="🏆" color="var(--green)"  delay={0.1} />
        <StatCard label="Pending Analysis"   value={stats?.pendingSubmissions || 0} icon="⏳" color="var(--purple)" delay={0.15}
          sub={stats?.pendingSubmissions > 0 ? 'Refreshing…' : 'All up to date'} />
      </div>

      {/* Charts row */}
      {stats?.totalSubmissions > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Score history */}
          <Card style={{ padding: '24px' }} className="animate-fade-in-up delay-2">
            <h3 style={{ marginBottom: 20, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Score History
            </h3>
            {stats.recentScores?.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.recentScores}>
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}
                    labelFormatter={(d) => new Date(d).toLocaleDateString()}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Submit more code to see score trends
              </div>
            )}
          </Card>

          {/* Category radar */}
          <Card style={{ padding: '24px' }} className="animate-fade-in-up delay-3">
            <h3 style={{ marginBottom: 12, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Avg Categories
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Radar dataKey="A" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Category scores */}
      {stats?.totalSubmissions > 0 && (
        <Card className="animate-fade-in-up delay-3">
          <h3 style={{ marginBottom: 20, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Average Category Scores
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'codeQuality',      label: 'Code Quality' },
              { key: 'security',         label: 'Security' },
              { key: 'performance',      label: 'Performance' },
              { key: 'maintainability',  label: 'Maintainability' },
              { key: 'bestPractices',    label: 'Best Practices' },
            ].map(({ key, label }) => (
              <ProgressBar
                key={key}
                label={label}
                value={stats.avgCategories?.[key] || 0}
                color={scoreColor(stats.avgCategories?.[key])}
                height={8}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Recent submissions */}
      <Card className="animate-fade-in-up delay-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Recent Submissions
          </h3>
          <Link to="/submissions" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
            View all →
          </Link>
        </div>

        {submissions.length === 0 ? (
          <EmptyState
            icon="💻"
            title="No submissions yet"
            description="Submit your first code snippet and get instant AI-powered feedback."
            action={
              user?.role !== 'reviewer' && (
                <Link to="/submit">
                  <Button variant="primary">Submit Code</Button>
                </Link>
              )
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {submissions.map((sub, i) => (
              <Link
                key={sub._id}
                to={`/analysis/${sub._id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px', borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {/* Language dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: LANG_COLORS[sub.language] || '#8888aa',
                  boxShadow: `0 0 6px ${LANG_COLORS[sub.language] || '#8888aa'}88`,
                }} />

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {sub.language} · {sub.linesOfCode} lines · {new Date(sub.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Score or status */}
                {sub.analysis?.overallScore != null ? (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: gradeColor(sub.analysis.grade) }}>
                      {sub.analysis.overallScore}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Grade {sub.analysis.grade}
                    </div>
                  </div>
                ) : (
                  <Badge
                    label={sub.status}
                    variant={sub.status}
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Language breakdown */}
      {stats?.languageCounts && Object.keys(stats.languageCounts).length > 0 && (
        <Card className="animate-fade-in-up">
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Submissions by Language
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(stats.languageCounts).map(([lang, count]) => (
              <div key={lang} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[lang] || '#8888aa' }} />
                <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{lang}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
