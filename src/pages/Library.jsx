import React, { useState } from 'react';
import TopBar from '../components/layout/TopBar';
import { getLibrary, saveToLibrary, deleteFromLibrary } from '../utils/storage';
import { toast } from '../utils/toast';

export default function Library() {
  const [docs, setDocs] = useState(getLibrary());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  function handleAdd() {
    if (!form.title.trim() || !form.content.trim()) {
      toast('Title and content are required.', 'error'); return;
    }
    setSaving(true);
    const wordCount = form.content.trim().split(/\s+/).length;
    const entry = saveToLibrary({ ...form, words: wordCount });
    setDocs(getLibrary());
    setForm({ title: '', author: '', content: '' });
    setShowAdd(false);
    setSaving(false);
    toast('Document added to corpus', 'success');
  }

  function handleDelete(id) {
    deleteFromLibrary(id);
    setDocs(getLibrary());
    toast('Document removed from corpus', 'info');
  }

  const totalWords = docs.reduce((s, d) => s + (d.words || 0), 0);

  return (
    <div className="flex-col" style={{ height: '100%' }}>
      <TopBar
        title="Reference Library"
        subtitle="Manage the corpus of source documents used for originality comparisons."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '✕ Cancel' : '+ Add Document'}
          </button>
        }
      />

      <div className="page-area">
        {/* Stats */}
        <div className="grid-3 mb-6 fade-in">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{docs.length}</div>
            <div className="stat-label">Documents in corpus</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{totalWords.toLocaleString()}</div>
            <div className="stat-label">Total words indexed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>Active</div>
            <div className="stat-label">Corpus status</div>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card mb-6 fade-in">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Reference Document</div>
            <div className="grid-2 gap-4 mb-4">
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Author</label>
                <input className="input" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" />
              </div>
            </div>
            <div className="mb-4">
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Content *</label>
              <textarea
                className="textarea" style={{ minHeight: 160 }}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Paste the reference document content here…"
              />
              <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4, textAlign: 'right' }}>
                {form.content.trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>Add to Corpus</button>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setForm({ title: '', author: '', content: '' }); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Corpus list */}
        <div className="card fade-in-delay-1">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Corpus</div>

          {docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No documents in corpus</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Add reference documents to enable plagiarism detection.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{
                  background: 'var(--bg-secondary)', borderRadius: 12,
                  border: '1px solid var(--border)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: 'rgba(124,58,237,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        By {doc.author || 'Unknown'} · {(doc.words || 0).toLocaleString()} words · Added {doc.addedAt}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
                      >{expanded === doc.id ? 'Hide' : 'Preview'}</button>
                      <button
                        className="btn btn-xs"
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleDelete(doc.id)}
                      >Remove</button>
                    </div>
                  </div>
                  {expanded === doc.id && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, border: '1px solid var(--border)' }}>
                        {doc.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
