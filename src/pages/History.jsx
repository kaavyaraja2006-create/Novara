import React, { useState } from 'react';
import TopBar from '../components/layout/TopBar';
import { getChecks, deleteCheck, getRiskBadge, formatDate } from '../utils/storage';
import { toast } from '../utils/toast';
import { ResultView } from './TextAnalysis';
import { CodeResultView } from './CodeAnalysis';

export default function History({ onNavigate }) {
  const [checks, setChecks] = useState(getChecks());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [openCheck, setOpenCheck] = useState(null);
  const [humanized, setHumanized] = useState(null);
  const [humanizing, setHumanizing] = useState(false);

  function handleDelete(id, e) {
    e.stopPropagation();
    deleteCheck(id);
    setChecks(getChecks());
    toast('Check deleted', 'info');
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    toast(`✓ ${label} copied`, 'success');
  }

  async function handleHumanize() {
    if (!openCheck) return;
    setHumanizing(true);
    try {
      if (openCheck.type === 'code') {
        const { humanizeCode } = await import('../utils/gemini');
        const res = await humanizeCode(openCheck.content, openCheck.result?.language || 'auto');
        setHumanized(res);
      } else {
        const { humanizeText } = await import('../utils/gemini');
        const res = await humanizeText(openCheck.content);
        setHumanized(res);
      }
    } catch (e) {
      toast('Humanize failed — check proxy server.', 'error');
    } finally {
      setHumanizing(false);
    }
  }

  const filtered = checks.filter(c => {
    const matchSearch = !search || (c.title || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.type === filter;
    return matchSearch && matchFilter;
  });

  // ── Detail view ──────────────────────────────────────────────
  if (openCheck) {
    const badge = getRiskBadge(openCheck.originality || 0);
    const back = () => { setOpenCheck(null); setHumanized(null); };

    return (
      <div className="flex-col" style={{ height: '100%' }}>
        <TopBar title={openCheck.title || 'Untitled'} subtitle={`Reopened from history · ${formatDate(openCheck.createdAt)}`} />
        <div className="page-area">
          {openCheck.type === 'code' ? (
            <CodeResultView
              result={openCheck.result}
              code={openCheck.content}
              title={openCheck.title}
              language={openCheck.result?.language || 'auto'}
              riskColor={openCheck.result?.overallRisk === 'high' ? 'var(--danger)' : openCheck.result?.overallRisk === 'medium' ? 'var(--warning)' : 'var(--success)'}
              onReset={back}
              backLabel="← Back to History"
              onHumanize={handleHumanize}
              humanizing={humanizing}
              humanized={humanized}
              onCopy={copyToClipboard}
            />
          ) : (
            <ResultView
              result={openCheck.result}
              content={openCheck.content}
              title={openCheck.title}
              mode={openCheck.mode}
              threshold={openCheck.threshold}
              wordCount={openCheck.wordCount}
              badge={badge}
              onReset={back}
              backLabel="← Back to History"
              onHumanize={handleHumanize}
              humanizing={humanizing}
              humanized={humanized}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────
  return (
    <div className="flex-col" style={{ height: '100%' }}>
      <TopBar
        title="History"
        subtitle="Click any check to reopen its full report."
        actions={<button className="btn btn-primary btn-sm" onClick={() => onNavigate('check')}>+ New Check</button>}
      />
      <div className="page-area">
        <div className="flex gap-3 mb-6 fade-in" style={{ alignItems: 'center' }}>
          <input
            className="input" style={{ maxWidth: 280 }}
            placeholder="Search checks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="mode-toggle" style={{ width: 'auto' }}>
            <button className={`mode-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`mode-btn ${filter === 'text' ? 'active' : ''}`} onClick={() => setFilter('text')}>Text</button>
            <button className={`mode-btn ${filter === 'code' ? 'active' : ''}`} onClick={() => setFilter('code')}>Code</button>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} results</span>
        </div>

        <div className="card fade-in-delay-1">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🕘</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{checks.length === 0 ? 'No checks yet' : 'No results match your search'}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {checks.length === 0 ? 'Run your first analysis to build a history.' : 'Try a different search term or filter.'}
              </div>
              {checks.length === 0 && (
                <button className="btn btn-primary btn-sm mt-4" onClick={() => onNavigate('check')}>Run Analysis</button>
              )}
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px 100px 120px 80px',
                gap: 16, padding: '10px 16px',
                fontSize: 11, fontWeight: 600, color: 'var(--text-disabled)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                borderBottom: '1px solid var(--border)', marginBottom: 8,
              }}>
                <span>Document</span>
                <span>Date</span>
                <span>Mode</span>
                <span>Words</span>
                <span>Originality</span>
                <span>Action</span>
              </div>

              {filtered.map((c) => {
                const badge = getRiskBadge(c.originality || 0);
                const scoreColor = badge.cls.includes('success') ? 'var(--success)' : badge.cls.includes('warning') ? 'var(--warning)' : 'var(--danger)';
                return (
                  <div
                    key={c.id}
                    onClick={() => { setOpenCheck(c); setHumanized(null); }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 80px 100px 120px 80px',
                      gap: 16, padding: '14px 16px',
                      alignItems: 'center',
                      borderRadius: 10,
                      transition: 'background 200ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: c.type === 'code' ? 'rgba(59,130,246,0.15)' : 'rgba(124,58,237,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{c.type === 'code' ? '💻' : '📄'}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'Untitled'}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                    <span style={{
                      fontSize: 12, padding: '3px 8px',
                      background: c.mode === 'deep' ? 'rgba(124,58,237,0.1)' : 'rgba(6,182,212,0.1)',
                      color: c.mode === 'deep' ? 'var(--accent)' : 'var(--info)',
                      borderRadius: 6, fontWeight: 600,
                    }}>{c.mode || 'fast'}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(c.wordCount || 0).toLocaleString()}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{c.originality || 0}%</span>
                      <span className={`badge ${badge.cls}`} style={{ fontSize: 10 }}>{badge.label}</span>
                    </div>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={(e) => handleDelete(c.id, e)}
                      style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                    >Delete</button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
