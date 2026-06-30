import React, { useState, useRef } from 'react';
import TopBar from '../components/layout/TopBar';
import CircularGauge from '../components/CircularGauge';
import { analyzeCodeWithAI, humanizeCode } from '../utils/gemini';
import { saveCheck, detectCodeLanguage, getRiskBadge } from '../utils/storage';
import { toast } from '../utils/toast';

const LANGUAGES = ['Auto-detect','Python','Java','C','C++','JavaScript','TypeScript','Go','Rust','PHP','SQL','HTML','CSS','Bash','R','Kotlin','Swift'];

export default function CodeAnalysis({ initialCheck, onBackToHistory }) {
  const [title, setTitle] = useState(initialCheck?.title || '');
  const [code, setCode] = useState(initialCheck?.content || '');
  const [language, setLanguage] = useState('Auto-detect');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [result, setResult] = useState(initialCheck?.result || null);
  const [humanizing, setHumanizing] = useState(false);
  const [humanized, setHumanized] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const detectedLang = language === 'Auto-detect' ? detectCodeLanguage(code) : language.toLowerCase();
  const lineCount = code.split('\n').length;

  const msgs = [
    'Parsing code structure…',
    'Detecting AI patterns…',
    'Running plagiarism analysis…',
    'Computing similarity scores…',
    'Building code report…',
  ];

  async function runAnalysis() {
    if (!code.trim()) { toast('Please paste or upload code first.', 'error'); return; }
    setLoading(true); setResult(null); setHumanized(null);
    let mi = 0; setLoadingMsg(msgs[0]);
    const interval = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); setLoadingMsg(msgs[mi]); }, 900);

    try {
      const res = await analyzeCodeWithAI(code, detectedLang);
      setResult(res);
      saveCheck({
        type: 'code',
        title: title || 'Untitled Code',
        content: code,
        originality: res.originality,
        wordCount: lineCount,
        flaggedCount: res.flaggedBlocks || 0,
        mode: 'fast',
        result: res,
      });
    } catch (e) {
      toast('Analysis failed. Check your Gemini API key.', 'error');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  async function runHumanize() {
    if (!code.trim()) return;
    setHumanizing(true);
    try {
      const res = await humanizeCode(code, detectedLang);
      setHumanized(res);
    } catch (e) {
      toast('Humanize failed. Check your Gemini API key.', 'error');
    } finally { setHumanizing(false); }
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    toast(`✓ ${label} copied to clipboard`, 'success');
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { const r = new FileReader(); r.onload = ev => setCode(ev.target.result); r.readAsText(file); }
  }

  const riskColor = result
    ? (result.overallRisk === 'high' ? 'var(--danger)' : result.overallRisk === 'medium' ? 'var(--warning)' : 'var(--success)')
    : 'var(--accent)';

  return (
    <div className="flex-col" style={{ height: '100%' }}>
      <TopBar title="Code Analysis" subtitle="Submit source code to detect AI generation and plagiarism." />
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
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const r = new FileReader(); r.onload = ev => setCode(ev.target.result); r.readAsText(e.target.files[0]); }} />
              <div style={{ fontSize: 36, marginBottom: 12 }}>💻</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Drop a source file here</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Any programming language · or paste below</div>
            </div>

            <div className="card mb-4">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Submission Details</div>
              <div className="grid-2 gap-4 mb-4">
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Title</label>
                  <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. dash.py" />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Language</label>
                  <select className="select" value={language} onChange={e => setLanguage(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {code && (
                <div style={{
                  padding: '6px 12px', background: 'rgba(59,130,246,0.1)',
                  borderRadius: 6, border: '1px solid rgba(59,130,246,0.2)',
                  fontSize: 12, color: 'var(--accent-blue)', marginBottom: 12, display: 'inline-flex', gap: 8, alignItems: 'center',
                }}>
                  <span>🔍</span> Detected: <strong>{detectedLang}</strong> · {lineCount} lines
                </div>
              )}

              <textarea
                className="code-editor"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Paste source code here…"
                style={{ minHeight: 280, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
              />
            </div>

            <button
              className="btn btn-primary w-full"
              style={{ padding: '14px 24px', fontSize: 15 }}
              onClick={runAnalysis}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {loadingMsg}
                </span>
              ) : '🔍 Analyze Code'}
            </button>
          </div>
        ) : (
          <CodeResultView
            result={result}
            code={code}
            title={title}
            language={detectedLang}
            riskColor={riskColor}
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

export function CodeResultView({ result, code, title, language, riskColor, onReset, backLabel, onHumanize, humanizing, humanized, onCopy }) {
  const riskBadge = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' }[result.overallRisk] || 'badge-info';

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{title || 'Code Analysis Result'}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {result.linesOfCode} lines · {language}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onCopy(buildCodeReport(result, title, language), 'Report')}>📋 Copy Report</button>
          <button className="btn btn-secondary btn-sm" onClick={onReset}>{backLabel || '← New Analysis'}</button>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid-3 mb-6">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>AI Probability</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CircularGauge value={result.aiProbability} color="var(--danger)" size={120} sublabel="%" />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Human Probability</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{result.humanProbability}%</div>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Confidence</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CircularGauge value={result.confidence} color="var(--accent-blue)" size={120} sublabel="%" />
          </div>
          <div style={{ marginTop: 12 }}>
            <span className={`badge ${riskBadge}`}>Overall Risk: {result.overallRisk}</span>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Originality</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CircularGauge value={result.originality} color="var(--success)" size={120} sublabel="%" />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Plagiarism</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{result.plagiarismScore}%</div>
          </div>
        </div>
      </div>

      {/* AI Pattern Detection */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>AI Pattern Detection</div>
          <span className={`badge ${riskBadge} mb-4`} style={{ display: 'inline-block', marginBottom: 12 }}>{result.overallRisk} risk</span>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>{result.aiExplanation}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(result.detectedPatterns || []).map((p, i) => (
              <span key={i} style={{
                padding: '4px 10px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
                fontSize: 12, color: 'var(--danger)',
              }}>{p}</span>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Plagiarism Analysis</div>
          <div className="flex items-center gap-3 mb-4" style={{ marginBottom: 14 }}>
            <span className="badge badge-success">low risk</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Similarity to reference patterns</span>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
            <MiniStat label="Originality" value={`${result.originality}%`} color="var(--success)" />
            <MiniStat label="Similarity" value={`${result.plagiarismScore}%`} color="var(--danger)" />
            <MiniStat label="Matches" value="None" color="var(--text-muted)" />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.plagiarismExplanation}</p>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', gap: 24 }}>
            <MiniStat label="Language" value={language} />
            <MiniStat label="Blocks analyzed" value={result.blocksAnalyzed || 0} />
            <MiniStat label="Flagged blocks" value={result.flaggedBlocks || 0} />
            <MiniStat label="Lines of code" value={result.linesOfCode || 0} />
          </div>
        </div>
      </div>

      {/* Original Code */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{title || 'Source Code'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{language} · {result.linesOfCode} lines</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '4px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--accent-blue)' }}>{language}</span>
            <button className="btn btn-secondary btn-xs" onClick={() => onCopy(code, 'Original code')}>Copy Code</button>
          </div>
        </div>
        <pre style={{
          background: '#0d1117', padding: 16, borderRadius: 10,
          fontSize: 13, lineHeight: 1.6, color: '#e6edf3',
          overflow: 'auto', maxHeight: 400,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          border: '1px solid rgba(255,255,255,0.06)',
        }}>{code}</pre>
      </div>

      {/* Humanize Code */}
      <div className="card mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Humanize Code</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rewrite flagged AI patterns while preserving identical functionality.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onHumanize} disabled={humanizing}>
            {humanizing ? '⏳ Humanizing…' : '✨ Humanize Code'}
          </button>
        </div>

        {!humanized && !humanizing && (
          <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Click the button above to intelligently rewrite the flagged portions while preserving functionality.
          </div>
        )}

        {humanizing && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rewriting with Gemini AI…</div>
          </div>
        )}

        {humanized && (
          <>
            <div className="grid-2 gap-4 mb-4">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Original Code</div>
                <pre style={{ background: '#0d1117', padding: 14, borderRadius: 10, fontSize: 12, color: '#e6edf3', overflow: 'auto', maxHeight: 300, fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(255,255,255,0.06)' }}>{code}</pre>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Humanized Code</span>
                  <button className="btn btn-secondary btn-xs" onClick={() => onCopy(humanized.humanizedCode, 'Humanized code')}>Copy</button>
                </div>
                <pre style={{ background: 'rgba(34,197,94,0.05)', padding: 14, borderRadius: 10, fontSize: 12, color: '#e6edf3', overflow: 'auto', maxHeight: 300, fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(34,197,94,0.15)' }}>{humanized.humanizedCode}</pre>
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--bg-card-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>IMPROVEMENT SUMMARY</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{humanized.changes}</p>
            </div>
          </>
        )}
      </div>
    </div>
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

function buildCodeReport(result, title, language) {
  return `NOVARA CODE ANALYSIS REPORT
============================
Title: ${title || 'Untitled'}
Language: ${language}
Date: ${new Date().toLocaleString()}
Lines of Code: ${result.linesOfCode}

AI DETECTION:
  AI Probability: ${result.aiProbability}%
  Human Probability: ${result.humanProbability}%
  Confidence: ${result.confidence}%
  Overall Risk: ${result.overallRisk?.toUpperCase()}

AI Patterns Detected: ${(result.detectedPatterns || []).join(', ')}

AI EXPLANATION:
${result.aiExplanation}

PLAGIARISM ANALYSIS:
  Originality: ${result.originality}%
  Plagiarism Score: ${result.plagiarismScore}%
  Blocks Analyzed: ${result.blocksAnalyzed}
  Flagged Blocks: ${result.flaggedBlocks}

PLAGIARISM EXPLANATION:
${result.plagiarismExplanation}

---
Generated by Novara AI Originality Platform
`;
}
