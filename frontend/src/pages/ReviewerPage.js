/**
 * pages/ReviewerPage.js — Reviewer Dashboard
 *
 * WHAT: Platform-wide view accessible only to users with the 'reviewer' role.
 *       Shows all submissions from all developers with search, filters, and stats.
 *
 * HOW:  Calls GET /api/code/reviewer/all and GET /api/analysis/reviewer/leaderboard.
 *       Renders a searchable, filterable table of all submissions across all users.
 *
 * WHY:  Reviewers need a centralized view to monitor platform activity, identify
 *       common issues, and spot the highest-quality code for recognition.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Card, Badge, Button, Spinner, EmptyState, Alert, StatCard } from '../components/ui';

const LANG_COLORS = {
  javascript: '#f7df1e', python: '#3776ab', java: '#ed8b00',
  typescript: '#3178c6', go: '#00add8', rust: '#ce4a00', cpp: '#00599c', other: '#8888aa',
};

const gradeColor = (g) => ({
  A: 'var(--green)', B: 'var(--accent)', C: 'var(--yellow)', D: 'var(--orange)', F: 'var(--red)'
}[g] || 'var(--text-muted)');

export default function ReviewerPage() {
  const [submissions, setSubmissions]   = useState([]);
  const [leaderboard, setLeaderboard]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [filters, setFilters]           = useState({ language: '', status: '', page: 1 });
  const [pagination, setPagination]     = useState({ total: 0, pages: 1 });
  const [activeTab, setActiveTab]       = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 15, page: filters.page });
      if (filters.language) params.append('language', filters.language);
      if (filters.status)   params.append('status', filters.status);

      const [subRes, lbRes] = await Promise.all([
        api.get(`/code/reviewer/all?${params}`),
        api.get('/analysis/reviewer/leaderboard'),
      ]);

      setSubmissions(subRes.data.submissions || []);
      setPagination({ total: subRes.data.total, pages: subRes.data.pages });
      setLeaderboard(lbRes.data.leaderboard || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviewer data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter by search client-side
  const filtered = submissions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.user?.name?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q) ||
      s.language?.toLowerCase().includes(q)
    );
  });

  // Platform stats from submissions
  const completedSubs = submissions.filter((s) => s.status === 'completed');
  const avgScore = completedSubs.length > 0
    ? Math.round(completedSubs.reduce((sum, s) => sum + (s.analysis?.overallScore || 0), 0) / completedSubs.length)
    : 0;

  const tabs = [
    { id: 'all',         label: `All Submissions (${pagination.total})` },
    { id: 'leaderboard', label: `Top Scores (${leaderboard.length})` },
  ];

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          Reviewer Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Platform-wide view of all code submissions and AI review results.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Platform stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Submissions"  value={pagination.total}        icon="📦" color="var(--accent)"  delay={0} />
        <StatCard label="Completed Reviews"  value={completedSubs.length}    icon="✅" color="var(--green)"  delay={0.05} />
        <StatCard label="Platform Avg Score" value={avgScore || '—'}         icon="📊" color="var(--yellow)" delay={0.1} />
        <StatCard label="Top Score"          value={leaderboard[0]?.overallScore || '—'} icon="🏆" color="var(--purple)" delay={0.15} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ALL SUBMISSIONS TAB */}
      {activeTab === 'all' && (
        <>
          {/* Filters row */}
          <Card style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by title, user, language…"
              style={{ flex: 1, minWidth: 200, padding: '8px 14px', fontSize: '0.85rem' }}
            />
            <select
              value={filters.language}
              onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value, page: 1 }))}
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <option value="">All Languages</option>
              {['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust', 'other'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <option value="">All Statuses</option>
              {['pending', 'analyzing', 'completed', 'failed'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Card>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={40} /></div>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState icon="🔍" title="No submissions found" description="Try adjusting your search or filters." />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((sub, i) => (
                <Card key={sub._id} hover style={{
                  padding: '14px 18px',
                  animation: `fadeIn 0.3s ease ${i * 0.03}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {/* Lang badge */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      background: `${LANG_COLORS[sub.language] || '#8888aa'}20`,
                      border: `1px solid ${LANG_COLORS[sub.language] || '#8888aa'}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 800,
                      color: LANG_COLORS[sub.language] || '#8888aa', textTransform: 'uppercase',
                    }}>
                      {sub.language?.slice(0, 3)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.title}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* User info */}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          👤 {sub.user?.name || 'Unknown'} ({sub.user?.email})
                        </span>
                        <Badge label={sub.status} variant={sub.status} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {sub.linesOfCode} lines · {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    {sub.analysis?.overallScore != null ? (
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: gradeColor(sub.analysis?.grade), lineHeight: 1 }}>
                          {sub.analysis.overallScore}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Grade {sub.analysis?.grade}
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: 50 }} />
                    )}

                    <Link to={`/analysis/${sub._id}`}>
                      <Button variant="ghost" size="sm">View →</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <Button variant="ghost" size="sm" disabled={filters.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}>← Prev</Button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Page {filters.page} of {pagination.pages}
              </span>
              <Button variant="ghost" size="sm" disabled={filters.page >= pagination.pages}
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}>Next →</Button>
            </div>
          )}
        </>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaderboard.length === 0 ? (
            <Card><EmptyState icon="🏆" title="No completed reviews yet" description="Scores will appear here once code submissions are analysed." /></Card>
          ) : leaderboard.map((item, i) => (
            <Card key={item._id} hover style={{
              padding: '16px 20px',
              borderLeft: i < 3 ? `3px solid ${['var(--yellow)', 'var(--text-muted)', 'var(--orange)'][i]}` : '3px solid var(--border)',
              animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Rank */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: i < 3 ? ['var(--yellow-dim)', 'rgba(136,136,170,0.15)', 'var(--orange-dim)'][i] : 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontFamily: 'var(--font-display)',
                  color: i < 3 ? ['var(--yellow)', 'var(--text-muted)', 'var(--orange)'][i] : 'var(--text-muted)',
                  fontSize: '1rem',
                }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.submission?.title || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.submission?.language} · {item.submission?.user?.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: gradeColor(item.grade), lineHeight: 1 }}>
                    {item.overallScore}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Grade {item.grade}
                  </div>
                </div>

                {item.submission?._id && (
                  <Link to={`/analysis/${item.submission._id}`}>
                    <Button variant="ghost" size="sm">View →</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
