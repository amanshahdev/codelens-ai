/**
 * pages/SubmissionsPage.js — Submission History
 *
 * WHAT: Paginated list of all the current user's code submissions with
 *       filtering by status and language, and quick-access score badges.
 *
 * HOW:  Calls GET /api/code with query params for page, status, language.
 *       Each row links to the AnalysisPage. Provides delete button inline.
 *
 * WHY:  Developers need a bird's-eye view of their review history to track
 *       improvement over time and re-visit specific submissions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Card, Badge, Button, Spinner, EmptyState, Alert } from '../components/ui';

const LANG_COLORS = {
  javascript: '#f7df1e', python: '#3776ab', java: '#ed8b00',
  typescript: '#3178c6', go: '#00add8', rust: '#ce4a00', cpp: '#00599c', other: '#8888aa',
};

const gradeColor = (g) => ({ A: 'var(--green)', B: 'var(--accent)', C: 'var(--yellow)', D: 'var(--orange)', F: 'var(--red)' }[g] || 'var(--text-muted)');

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filters, setFilters]         = useState({ status: '', language: '', page: 1 });
  const [pagination, setPagination]   = useState({ total: 0, pages: 1 });
  const [deleting, setDeleting]       = useState(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 10, page: filters.page });
      if (filters.status)   params.append('status', filters.status);
      if (filters.language) params.append('language', filters.language);

      const res = await api.get(`/code?${params}`);
      setSubmissions(res.data.submissions || []);
      setPagination({ total: res.data.total, pages: res.data.pages });
    } catch {
      setError('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Poll for pending
  useEffect(() => {
    const hasPending = submissions.some((s) => s.status === 'pending' || s.status === 'analyzing');
    if (!hasPending) return;
    const id = setInterval(fetchSubmissions, 5000);
    return () => clearInterval(id);
  }, [submissions, fetchSubmissions]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this submission?')) return;
    setDeleting(id);
    try {
      await api.delete(`/code/${id}`);
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
    } catch {
      setError('Failed to delete submission.');
    } finally {
      setDeleting(null);
    }
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val, page: 1 }));
  };

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: 4 }}>My Reviews</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {pagination.total} submission{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/submit">
          <Button variant="primary" size="sm">+ New Submission</Button>
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Filters */}
      <Card style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
          FILTER BY:
        </span>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="analyzing">Analyzing</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filters.language}
          onChange={(e) => handleFilterChange('language', e.target.value)}
          style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
        >
          <option value="">All Languages</option>
          {['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust', 'other'].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {(filters.status || filters.language) && (
          <button
            onClick={() => setFilters({ status: '', language: '', page: 1 })}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            Clear ×
          </button>
        )}
      </Card>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={40} /></div>
      ) : submissions.length === 0 ? (
        <Card>
          <EmptyState
            icon="📭"
            title="No submissions found"
            description={filters.status || filters.language ? 'Try changing your filters.' : 'Submit your first code snippet to get started.'}
            action={!filters.status && !filters.language && (
              <Link to="/submit"><Button variant="primary">Submit Code</Button></Link>
            )}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submissions.map((sub, i) => (
            <Card
              key={sub._id}
              hover
              style={{
                padding: '16px 20px',
                animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Language indicator */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: `${LANG_COLORS[sub.language] || '#8888aa'}22`,
                  border: `1px solid ${LANG_COLORS[sub.language] || '#8888aa'}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 800,
                  color: LANG_COLORS[sub.language] || '#8888aa', textTransform: 'uppercase',
                }}>
                  {sub.language.slice(0, 3)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge label={sub.status} variant={sub.status} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {sub.linesOfCode} lines
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                    {sub.tags?.length > 0 && sub.tags.slice(0, 2).map((t) => (
                      <span key={t} style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score */}
                {sub.analysis?.overallScore != null && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: gradeColor(sub.analysis.grade), lineHeight: 1 }}>
                      {sub.analysis.overallScore}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Grade {sub.analysis.grade}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link to={`/analysis/${sub._id}`}>
                    <Button variant="ghost" size="sm">View →</Button>
                  </Link>
                  <Button
                    variant="danger" size="sm"
                    loading={deleting === sub._id}
                    onClick={() => handleDelete(sub._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <Button
            variant="ghost" size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Prev
          </Button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Page {filters.page} of {pagination.pages}
          </span>
          <Button
            variant="ghost" size="sm"
            disabled={filters.page >= pagination.pages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
