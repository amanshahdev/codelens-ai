/**
 * pages/SubmitCodePage.js — Code Submission Form
 *
 * WHAT: The primary input page where developers paste or upload code for review.
 *
 * HOW:  Two input modes — text snippet (textarea) and file upload (drag-and-drop).
 *       On submit, sends multipart/form-data to POST /api/code.
 *       Immediately redirects to the analysis page so the user can watch results load.
 *
 * WHY:  Friction-free submission is critical — the easier it is to submit,
 *       the more value users get. The two-mode UI caters to both copy-paste
 *       quick reviews and full-file reviews.
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card, Button, Alert } from '../components/ui';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python',     label: 'Python' },
  { value: 'java',       label: 'Java' },
  { value: 'cpp',        label: 'C++' },
  { value: 'go',         label: 'Go' },
  { value: 'rust',       label: 'Rust' },
  { value: 'other',      label: 'Other' },
];

const SAMPLE_SNIPPETS = {
  javascript: `// Example: User authentication helper
const bcrypt = require('bcrypt');

var getUserData = async function(userId) {
  var data = await db.query("SELECT * FROM users WHERE id = " + userId);
  return data;
}

function validatePassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

// TODO: add rate limiting
async function loginUser(email, password) {
  var user = await getUserData(email);
  if (user == null) {
    return { error: "User not found" }
  }
  
  var valid = await validatePassword(password, user.password);
  if (!valid) {
    return { error: "Wrong password" }
  }
  
  // Generate token
  var token = jwt.sign({ id: user.id }, "mysecretkey123");
  return { token: token, user: user };
}`,

  python: `import os
import sqlite3

password = "admin123"
db_path = "/var/db/users.db"

def get_user(username):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchone()

def login(username, password):
    user = get_user(username)
    if user == None:
        return False
    
    if user[2] == password:
        return True
    return False

try:
    result = login("admin", password)
    print(result)
except:
    pass`,
};

export default function SubmitCodePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('snippet'); // 'snippet' | 'file'
  const [form, setForm] = useState({
    title: '',
    description: '',
    language: 'javascript',
    code: '',
    isPublic: false,
    tags: '',
  });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const ext = f.name.split('.').pop().toLowerCase();
    const langMap = { js: 'javascript', ts: 'typescript', py: 'python', java: 'java', cpp: 'cpp', go: 'go', rs: 'rust' };
    if (langMap[ext]) setForm((prev) => ({ ...prev, language: langMap[ext] }));
    if (!form.title) setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'snippet' && form.code.trim().length < 5) {
      return setError('Please enter at least 5 characters of code.');
    }
    if (mode === 'file' && !file) {
      return setError('Please select a file to upload.');
    }
    if (!form.title.trim()) {
      return setError('Please enter a title for your submission.');
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'file') {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('language', form.language);
        fd.append('isPublic', form.isPublic);
        fd.append('tags', form.tags);
        res = await api.post('/code', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/code', {
          title: form.title,
          description: form.description,
          language: form.language,
          code: form.code,
          isPublic: form.isPublic,
          tags: form.tags,
        });
      }

      const submissionId = res.data.submission._id;
      navigate(`/analysis/${submissionId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    const sample = SAMPLE_SNIPPETS[form.language] || SAMPLE_SNIPPETS.javascript;
    setForm((prev) => ({ ...prev, code: sample, title: prev.title || 'Sample Code Review' }));
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', animation: 'fadeInUp 0.4s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: 6 }}>Submit Code for Review</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Paste a snippet or upload a file. Our AI will analyse it for bugs, security issues, and best practices.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Alert type="error" message={error} onClose={() => setError('')} />

        {/* Title + Language */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>TITLE *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Auth middleware review" required />
            </div>
            <div>
              <label style={labelStyle}>LANGUAGE *</label>
              <select name="language" value={form.language} onChange={handleChange}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>DESCRIPTION (optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What does this code do? Any specific concerns?"
              rows={2}
              style={{ resize: 'vertical', minHeight: 60 }}
            />
          </div>
        </Card>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 10 }}>
          {['snippet', 'file'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: '9px 20px', borderRadius: 10,
                border: mode === m ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                background: mode === m ? 'var(--accent-dim)' : 'var(--bg-surface)',
                color: mode === m ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {m === 'snippet' ? '📝 Paste Snippet' : '📁 Upload File'}
            </button>
          ))}
        </div>

        {/* Code input area */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {mode === 'snippet' ? (
            <>
              {/* Code editor toolbar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {form.language} · {form.code.split('\n').length} lines
                </span>
                <button type="button" onClick={loadSample} style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, padding: '2px 8px',
                }}>
                  Load sample →
                </button>
              </div>
              <textarea
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder={`Paste your ${form.language} code here…`}
                rows={20}
                style={{
                  width: '100%', borderRadius: 0, border: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                  lineHeight: 1.7, resize: 'vertical', minHeight: 300,
                  background: 'var(--bg-base)', color: 'var(--text-primary)',
                  padding: '20px',
                  tabSize: 2,
                }}
              />
            </>
          ) : (
            /* File drop zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '60px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
                borderRadius: 16,
                background: dragOver ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 0.2s',
                margin: 4,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".js,.ts,.py,.java,.cpp,.go,.rs,.txt"
                onChange={(e) => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              {file ? (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '1rem', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📂</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Drop your file here or click to browse
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Supports .js, .ts, .py, .java, .cpp, .go, .rs · Max 500 KB
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Additional options */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>TAGS (comma-separated)</label>
              <input name="tags" value={form.tags} onChange={handleChange} placeholder="auth, security, backend" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                checked={form.isPublic}
                onChange={handleChange}
                style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <label htmlFor="isPublic" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                Make public (visible to reviewers)
              </label>
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" type="button" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} size="lg" style={{ minWidth: 180 }}>
            {loading ? 'Submitting…' : '🚀 Submit for AI Review'}
          </Button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem', fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  marginBottom: 7, fontFamily: 'var(--font-mono)',
};
