import React, { useState, useRef } from 'react';
import TopBar from '../components/layout/TopBar';
import CircularGauge from '../components/CircularGauge';
import { analyzeTextWithAI, humanizeText } from '../utils/gemini';
import { getLibrary, computePlagiarism, saveCheck, getSettings, getRiskBadge } from '../utils/storage';
import { toast } from '../utils/toast';

export default function TextAnalysis({ initialCheck, onBackToHistory }) {
  const settings = getSettings();
  const [title, setTitle] = useState(initialCheck?.title || '');
  const [content, setContent] = useState(initialCheck?.content || '');
  const [mode, setMode] = useState(initialCheck?.mode || settings.defaultMode || 'fast');
  const [threshold, setThreshold] = useState(initialCheck?.threshold || settings.threshold || 0.5);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [result, setResult] = useState(initialCheck?.result || null);
  const [humanizing, setHumanizing] = useState(false);
  const [humanized, setHumanized] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const fileRef = useRef();

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const msgs = [
    'Preprocessing text…',
    'Generating semantic embeddings…',
    'Computing similarity scores…',
    'Analyzing flagged sentences…',
    'Building originality report…',
  ];

  // ── File reading ──────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    setFileLoading(true);
    const name = file.name.toLowerCase();

    try {
      if (name.endsWith('.docx')) {
        await readDocx(file);
      } else if (name.endsWith('.pdf')) {
        toast('PDF support: please convert to .txt or paste text directly.', 'warning');
        setFileLoading(false);
        return;
      } else {
        // plain text / .txt / .md
        readPlainText(file);
      }
      // Set title from filename
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    } catch (e) {
      toast('Could not read file: ' + e.message, 'error');
    } finally {
      setFileLoading(false);
    }
  }

  function readPlainText(file) {
    const reader = new FileReader();
    reader.onload = e => setContent(e.target.result);
    reader.onerror = () => toast('Failed to read file.', 'error');
    reader.readAsText(file, 'UTF-8');
  }

  async function readDocx(file) {
    // Use mammoth via CDN loaded dynamically
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // mammoth is loaded via script tag in index.html
          if (typeof window.mammoth === 'undefined') {
            // fallback: try reading as text anyway
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(e.target.result);
            // Extract readable characters only
            const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
              .replace(/\s{3,}/g, '\n')
              .replace(/  +/g, ' ')
              .trim();
            if (cleaned.length > 100) {
              setContent(cleaned);
            } else {
              reject(new Error('Could not extract text. Please paste text manually.'));
            }
            resolve();
            return;
          }

          const arrayBuffer = e.target.result;
          const result = await window.mammoth.extractRawText({ arrayBuffer });
          if (result.value && result.value.trim().length > 0) {
            setContent(result.value.trim());
            toast('Document loaded successfully', 'success');
          } else {
            reject(new Error('No text found in document.'));
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── Analysis ──────────────────────────────────────────────────
  async function runAnalysis() {
    if (!content.trim() || content.trim().length < 20) {
      toast('Content must be at least 20 characters.', 'error');
      return;
    }
    setLoading(true); setResult(null); setHumanized(null);
    let mi = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => {
      mi = Math.min(mi + 1, msgs.length - 1);
      setLoadingMsg(msgs[mi]);
    }, 900);

    try {
      const library = getLibrary();
      const [aiResult, plagResult] = await Promise.all([
        analyzeTextWithAI(content, mode, threshold),
        Promise.resolve(computePlagiarism(content, library)),
      ]);

      const topSources = plagResult.topSources.map(m => ({
        title: m.doc.title,
        author: m.doc.author,
        similarity: m.similarity,
        matchedSentences: m.matchedSentences,
      }));

      const final = { ...aiResult, topSources, mode, threshold };
      setResult(final);

      saveCheck({
        type: 'text',
        title: title || 'Untitled',
        content,
        originality: final.originality,
        wordCount,
        flaggedCount: (final.flaggedSentences || []).length,
        mode,
        threshold,
        result: final,
      });
    } catch (e) {
      toast('Analysis failed — make sure the proxy server is running (npm start) and your API key is set in server.js.', 'error');
      console.error(e);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  async function runHumanize() {
    if (!content.trim()) return;
    setHumanizing(true);
    try {
      const res = await humanizeText(content);
      setHumanized(res);
    } catch (e) {
      toast('Humanize failed — check proxy server and API key.', 'error');
    } finally {
      setHumanizing(false);
    }
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    toast(`✓ ${label} copied`, 'success');
  }

  const badge = result ? getRiskBadge(result.originality) : null;
  const thresholdLabel = threshold < 0.4 ? 'Very lenient' : threshold < 0.6 ? 'Moderate' : threshold < 0.8 ? 'Strict' : 'Very strict';

  return (
    <div className="flex-col" style={{ height: '100%' }}>
      <TopBar title="Text Analysis" subtitle="Submit a document to check originality against your reference corpus." />

      <div className="page-area">
        {!result ? (
          <div className="fade-in">
            {/* Drop zone */}
            <div
              className={`drop-zone mb-6 ${dragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.docx"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {fileLoading ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>Reading file…</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Drop a file to auto-fill
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Supports <strong>.txt</strong>, <strong>.md</strong>, <strong>.docx</strong> · or paste below
                  </div>
                </>
              )}
            </div>

            {/* Document details */}
            <div className="card mb-4">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Document Details</div>
              <div className="mb-4">
                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Title</label>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title…" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Content</label>
                  <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{wordCount} words · {charCount} chars</span>
                </div>
                <textarea
                  className="textarea"
                  style={{ minHeight: 200 }}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste your text here, or upload a file above…"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="card mb-6">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Analysis Settings</div>
              <div className="grid-2 gap-6">
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>Mode</label>
                  <div className="mode-toggle">
                    <button className={`mode-btn ${mode === 'fast' ? 'active' : ''}`} onClick={() => setMode('fast')}>⚡ Fast</button>
                    <button className={`mode-btn ${mode === 'deep' ? 'active' : ''}`} onClick={() => setMode('deep')}>🧠 Deep</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    {mode === 'fast' ? 'Quick lexical check.' : 'Full semantic + structural analysis.'}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Similarity Threshold</label>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{threshold.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min="0.1" max="0.9" step="0.05"
                    value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value))}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{thresholdLabel}</div>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary w-full"
              style={{ padding: '14px 24px', fontSize: 15 }}
              onClick={runAnalysis}
              disabled={loading || content.trim().length < 20}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {loadingMsg}
                </span>
              ) : '🔍 Run Analysis'}
            </button>
          </div>
        ) : (
          <ResultView
            result={result}
            content={content}
            title={title}
            mode={mode}
            threshold={threshold}
            wordCount={wordCount}
            badge={badge}
            onReset={() => {
              if (initialCheck && onBackToHistory) { onBackToHistory(); return; }
              setResult(null); setHumanized(null);
            }}
            backLabel={initialCheck ? '← Back to History' : '← New Analysis'}
            onHumanize={runHumanize}
            humanizing={humanizing}
            humanized={humanized}
            onCopy={copyToClipboard}
          />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ResultView({ result, content, title, mode, threshold, wordCount, badge, onReset, backLabel, onHumanize, humanizing, humanized, onCopy }) {
  const gaugeColor = result.originality >= 70 ? 'var(--success)' : result.originality >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{title || 'Analysis Result'}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {wordCount} words · {mode} mode
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onCopy(buildReport(result, content, title, mode, threshold, wordCount), 'Report')}>📋 Copy Report</button>
          <button className="btn btn-secondary btn-sm" onClick={onReset}>{backLabel || '← New Analysis'}</button>
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <CircularGauge value={result.originality} color={gaugeColor} size={140} sublabel="/ 100" />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Originality Score</div>
            <span className={`badge ${badge.cls}`} style={{ fontSize: 13 }}>{badge.label}</span>
            <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
              <MiniStat label="Threshold" value={threshold} />
              <MiniStat label="Flagged" value={(result.flaggedSentences || []).length} color="var(--danger)" />
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 24 }}>
              <MiniStat label="Language" value={result.language || 'english'} />
              <MiniStat label="Mode" value={mode} />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Analysis Summary</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.summary}</p>
          <div className="divider" style={{ margin: '14px 0' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Structural Flow:</strong> {result.structuralFlow || 'Intro → Analysis → Conclusion'}
          </div>
          {result.aiProbability !== undefined && (
            <div className="mt-4">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>AI vs Human</div>
              <div style={{ display: 'flex', gap: 0, alignItems: 'center', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ flex: result.aiProbability, height: 8, background: 'var(--danger)' }} />
                <div style={{ flex: result.humanProbability, height: 8, background: 'var(--success)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--danger)' }}>AI {result.aiProbability}%</span>
                <span style={{ color: 'var(--success)' }}>Human {result.humanProbability}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Document Text</div>
            <button className="btn btn-secondary btn-xs" onClick={() => onCopy(content, 'Original text')}>Copy</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text-secondary)', maxHeight: 360, overflowY: 'auto' }}>
            <HighlightedText text={content} flagged={result.flaggedSentences || []} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 12 }}>
            <LegendDot color="var(--danger)" label="High" />
            <LegendDot color="var(--warning)" label="Moderate" />
            <LegendDot color="var(--success)" label="Original" />
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Top Sources</div>
          {result.topSources && result.topSources.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.topSources.map((s, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.similarity > 70 ? 'var(--danger)' : s.similarity > 40 ? 'var(--warning)' : 'var(--success)' }}>
                      {s.similarity}% match
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>By {s.author}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              No significant matches in corpus
            </div>
          )}
        </div>
      </div>

      {/* Humanize */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Humanize Text</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rewrite to sound natural and unmistakably human-authored.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onHumanize} disabled={humanizing}>
            {humanizing ? '⏳ Humanizing…' : '✨ Humanize Text'}
          </button>
        </div>

        {!humanized && !humanizing && (
          <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Click the button above to intelligently rewrite your text while preserving all ideas.
          </div>
        )}

        {humanizing && (
          <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rewriting with Gemini AI…</div>
          </div>
        )}

        {humanized && (
          <div className="grid-2 gap-4">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Original</div>
              <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 10, fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)', border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' }}>
                {content}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Humanized</span>
                <button className="btn btn-secondary btn-xs" onClick={() => onCopy(humanized.humanizedText, 'Humanized text')}>Copy</button>
              </div>
              <div style={{ padding: 14, background: 'rgba(34,197,94,0.05)', borderRadius: 10, fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)', border: '1px solid rgba(34,197,94,0.15)', maxHeight: 300, overflowY: 'auto' }}>
                {humanized.humanizedText}
              </div>
            </div>
            <div style={{ gridColumn: '1/-1', padding: 14, background: 'var(--bg-card-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>WHAT CHANGED</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{humanized.changes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedText({ text, flagged }) {
  if (!flagged || !flagged.length) return <span>{text}</span>;
  const parts = [];
  let remaining = text;

  flagged.forEach(f => {
    if (!f.text) return;
    const idx = remaining.indexOf(f.text);
    if (idx >= 0) {
      if (idx > 0) parts.push({ type: 'original', text: remaining.slice(0, idx) });
      parts.push({ type: f.risk, text: f.text, reason: f.reason, similarity: f.similarity });
      remaining = remaining.slice(idx + f.text.length);
    }
  });
  if (remaining) parts.push({ type: 'original', text: remaining });
  if (!parts.length) return <span>{text}</span>;

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'original') return <span key={i}>{p.text}</span>;
        const cls = p.type === 'high' ? 'highlight-high' : p.type === 'moderate' ? 'highlight-moderate' : 'highlight-original';
        return (
          <span key={i} className={cls} title={`${p.similarity || '?'}% similar — ${p.reason || ''}`}>
            {p.text}
          </span>
        );
      })}
    </>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function buildReport(result, content, title, mode, threshold, wordCount) {
  return `NOVARA ANALYSIS REPORT\n======================\nTitle: ${title || 'Untitled'}\nDate: ${new Date().toLocaleString()}\nMode: ${mode} | Threshold: ${threshold}\nWords: ${wordCount}\n\nORIGINALITY SCORE: ${result.originality}/100\nAI Probability: ${result.aiProbability}% | Human: ${result.humanProbability}%\n\nSUMMARY:\n${result.summary}\n\nFLAGGED SENTENCES:\n${(result.flaggedSentences || []).map((f, i) => `${i + 1}. [${f.similarity}% ${f.risk}] "${f.text}"\n   Reason: ${f.reason}`).join('\n\n')}\n\nTOP SOURCES:\n${(result.topSources || []).map((s, i) => `${i + 1}. ${s.title} by ${s.author} — ${s.similarity}% match`).join('\n')}\n\n---\nGenerated by Novara AI Originality Platform\n`;
}
