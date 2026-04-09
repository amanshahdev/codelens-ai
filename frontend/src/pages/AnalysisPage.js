/**
 * pages/AnalysisPage.js — AI Review Results
 *
 * WHAT: The detailed results page for a single code submission. Shows the
 *       overall score, grade, per-category bars, issue list with severity,
 *       recommendations, positives, and the original code with syntax highlighting.
 *
 * HOW:  Polls GET /api/code/:id every 3 seconds while status is pending/analyzing.
 *       Once completed, renders the full analysis from the populated `analysis` field.
 *       Uses react-syntax-highlighter for the code viewer.
 *
 * WHY:  This is the core value delivery page. Rich visual feedback (score ring,
 *       colour-coded issues, progress bars) makes the AI output immediately
 *       comprehensible without reading dense text.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../utils/api';
import { Card, Badge, ProgressBar, Spinner, Button, Alert } from '../components/ui';

// ── Score ring SVG ────────────────────────────────────────────────────────────
const ScoreRing = ({ score, grade }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#00e5a0' :
    score >= 60 ? '#00d4ff' :
    score >= 40 ? '#ffd60a' :
    '#ff4d6d';

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg-overlay)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          Grade {grade}
        </span>
      </div>
    </div>
  );
};

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical:   { color: 'var(--red)',    bg: 'var(--red-dim)',    icon: '🔴', label: 'Critical' },
  warning:    { color: 'var(--yellow)', bg: 'var(--yellow-dim)', icon: '🟡', label: 'Warning' },
  info:       { color: 'var(--accent)', bg: 'var(--accent-dim)', icon: '🔵', label: 'Info' },
  suggestion: { color: 'var(--purple)', bg: 'var(--purple-dim)', icon: '💡', label: 'Suggestion' },
};

const scoreColor = (value) => {
  const v = Number(value) || 0;
  if (v >= 80) return 'var(--green)';
  if (v >= 60) return 'var(--accent)';
  if (v >= 40) return 'var(--yellow)';
  return 'var(--red)';
};

export default function AnalysisPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await api.get(`/code/${submissionId}`);
      setSubmission(res.data.submission);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load submission.');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => { fetchSubmission(); }, [fetchSubmission]);

  // Poll while analysis is running
  useEffect(() => {
    if (!submission) return;
    if (submission.status === 'pending' || submission.status === 'analyzing') {
      const id = setInterval(fetchSubmission, 3000);
      return () => clearInterval(id);
    }
  }, [submission, fetchSubmission]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await api.post(`/code/${submissionId}/reanalyze`);
      setTimeout(fetchSubmission, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Re-analysis failed.');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    try {
      await api.delete(`/code/${submissionId}`);
      navigate('/submissions');
    } catch (err) {
      setError('Failed to delete submission.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
      <Spinner size={48} />
      <p style={{ color: 'var(--text-muted)' }}>Loading submission…</p>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center' }}>
      <Alert type="error" message={error} />
      <Link to="/submissions"><Button variant="ghost">← Back to submissions</Button></Link>
    </div>
  );

  if (!submission) return null;

  const analysis = submission.analysis;
  const isPending = submission.status === 'pending' || submission.status === 'analyzing';
  const isFailed = submission.status === 'failed';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'issues', label: `Issues ${analysis ? `(${analysis.issues?.length || 0})` : ''}` },
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'code', label: 'Source Code' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', animation: 'fadeInUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link to="/submissions" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← My Reviews
            </Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analysis</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: 6 }}>{submission.title}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Badge label={submission.language} variant="accent" />
            <Badge label={submission.status} variant={submission.status} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {submission.linesOfCode} lines · {new Date(submission.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={handleReanalyze} loading={reanalyzing} disabled={isPending}>
            🔄 Re-analyze
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            🗑 Delete
          </Button>
        </div>
      </div>

      {/* Pending state */}
      {isPending && (
        <Card style={{ padding: '48px 24px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <Spinner size={80} />
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🤖</span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>AI is reviewing your code…</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 380 }}>
              Our analysis engine is checking for best practices, security issues, and optimisation opportunities. This usually takes 3–10 seconds.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Parsing code', 'Detecting patterns', 'Scoring quality', 'Generating report'].map((step, i) => (
                <span key={step} style={{
                  fontSize: '0.7rem', padding: '4px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                  animation: `pulse 2s ease ${i * 0.3}s infinite`,
                }}>
                  {step}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Failed state */}
      {isFailed && (
        <Alert type="error" message="Analysis failed. Please try re-analyzing your submission." />
      )}

      {/* Analysis results */}
      {analysis && (
        <>
          {/* Score hero */}
          <Card style={{ padding: '28px 32px', marginBottom: 20 }} glow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
              <ScoreRing score={analysis.overallScore} grade={analysis.grade} />
              <div style={{ flex: 1 }}>
                <p style={{
                  color: 'var(--text-primary)', fontSize: '0.95rem',
                  lineHeight: 1.7, marginBottom: 12,
                }}>
                  {analysis.summary}
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    🤖 {analysis.aiModel}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ⏱ {analysis.processingTimeMs}ms
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    📋 {analysis.issues?.length || 0} issues found
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 700 : 400,
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ animation: 'fadeIn 0.25s ease' }} key={activeTab}>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Category scores */}
                <Card>
                  <h3 style={sectionTitle}>Category Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { key: 'codeQuality',     label: 'Code Quality' },
                      { key: 'security',        label: 'Security' },
                      { key: 'performance',     label: 'Performance' },
                      { key: 'maintainability', label: 'Maintainability' },
                      { key: 'bestPractices',   label: 'Best Practices' },
                    ].map(({ key, label }) => (
                      <ProgressBar
                        key={key}
                        label={label}
                        value={analysis.categories?.[key] || 0}
                        color={scoreColor(analysis.categories?.[key])}
                        height={10}
                      />
                    ))}
                  </div>
                </Card>

                {/* Issue severity breakdown */}
                <Card>
                  <h3 style={sectionTitle}>Issue Severity Breakdown</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => {
                      const count = analysis.issues?.filter((i) => i.severity === sev).length || 0;
                      return (
                        <div key={sev} style={{
                          padding: '16px', borderRadius: 12,
                          background: cfg.bg, border: `1px solid ${cfg.color}30`,
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{cfg.icon}</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: cfg.color }}>{count}</div>
                          <div style={{ fontSize: '0.7rem', color: cfg.color, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{cfg.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Positives */}
                {analysis.positives?.length > 0 && (
                  <Card>
                    <h3 style={sectionTitle}>✅ What's Done Well</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {analysis.positives.map((pos, i) => (
                        <div key={i} style={{
                          padding: '10px 14px', borderRadius: 8,
                          background: 'var(--green-dim)', border: '1px solid rgba(0,229,160,0.2)',
                          fontSize: '0.875rem', color: 'var(--green)', display: 'flex', gap: 10,
                        }}>
                          <span>✓</span> {pos}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Issues tab */}
            {activeTab === 'issues' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!analysis.issues?.length ? (
                  <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
                    <h3 style={{ color: 'var(--green)', fontFamily: 'var(--font-display)' }}>No issues detected!</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Your code passed all our automated checks.</p>
                  </Card>
                ) : (
                  analysis.issues.map((issue, i) => {
                    const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
                    return (
                      <Card key={i} style={{ padding: '16px 20px', borderLeft: `3px solid ${cfg.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cfg.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                              <Badge label={issue.severity} variant={issue.severity === 'warning' ? 'warning' : issue.severity === 'critical' ? 'danger' : issue.severity === 'suggestion' ? 'purple' : 'info'} />
                              <Badge label={issue.category} variant="default" />
                              {issue.line && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  Line {issue.line}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.6 }}>
                              {issue.message}
                            </p>
                            {issue.suggestion && (
                              <div style={{
                                padding: '8px 12px', borderRadius: 6,
                                background: 'var(--bg-elevated)',
                                fontSize: '0.8rem', color: 'var(--text-secondary)',
                                borderLeft: '2px solid var(--border-glow)',
                              }}>
                                💡 {issue.suggestion}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* Recommendations tab */}
            {activeTab === 'recommendations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analysis.recommendations?.map((rec, i) => (
                  <Card key={i} hover style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'var(--accent-dim)', border: '1px solid var(--border-glow)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)',
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                      {rec}
                    </p>
                  </Card>
                ))}
              </div>
            )}

            {/* Code tab */}
            {activeTab === 'code' && (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {submission.fileName || `${submission.title}.${submission.language}`} · {submission.linesOfCode} lines
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(submission.code)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Copy
                  </button>
                </div>
                <SyntaxHighlighter
                  language={submission.language === 'cpp' ? 'cpp' : submission.language}
                  style={vscDarkPlus}
                  showLineNumbers
                  customStyle={{
                    margin: 0, borderRadius: 0, fontSize: '0.82rem',
                    background: 'var(--bg-base)', maxHeight: '60vh',
                  }}
                >
                  {submission.code || ''}
                </SyntaxHighlighter>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Show code even while pending */}
      {isPending && submission.code && (
        <Card style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {submission.language} · {submission.linesOfCode} lines · Awaiting analysis
            </span>
          </div>
          <SyntaxHighlighter language={submission.language} style={vscDarkPlus} showLineNumbers
            customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.82rem', background: 'var(--bg-base)', maxHeight: '40vh' }}>
            {submission.code}
          </SyntaxHighlighter>
        </Card>
      )}
    </div>
  );
}

const sectionTitle = {
  fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)',
  letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
  marginBottom: 16,
};
