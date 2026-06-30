import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import TopBar from '../components/layout/TopBar';
import { getChecks, getLibrary, getRiskBadge, formatDate } from '../utils/storage';

const RISK_COLORS = ['#22C55E', '#F59E0B', '#EF4444'];

export default function Dashboard({ onNavigate, user }) {
  const checks = getChecks();
  const library = getLibrary();

  const stats = useMemo(() => {
    const textChecks = checks.filter(c => c.type === 'text');
    const avg = textChecks.length
      ? Math.round(textChecks.reduce((s, c) => s + (c.originality || 0), 0) / textChecks.length)
      : 0;
    const totalWords = textChecks.reduce((s, c) => s + (c.wordCount || 0), 0);
    const flagged = textChecks.reduce((s, c) => s + (c.flaggedCount || 0), 0);
    return { avg, totalWords, flagged, totalChecks: checks.length };
  }, [checks]);

  const trendData = useMemo(() => {
    const recent = checks.filter(c => c.type === 'text').slice(0, 8).reverse();
    if (recent.length < 2) {
      return [
        { name: 'Draft 1', originality: 45 },
        { name: 'Draft 2', originality: 62 },
        { name: 'Draft 3', originality: 70 },
        { name: 'Draft 4', originality: 78 },
        { name: 'Draft 5', originality: 85 },
      ];
    }
    return recent.map((c, i) => ({ name: `Check ${i + 1}`, originality: c.originality || 0 }));
  }, [checks]);

  const riskDist = useMemo(() => {
    const textChecks = checks.filter(c => c.type === 'text');
    const orig = textChecks.filter(c => (c.originality || 0) >= 70).length;
    const mod = textChecks.filter(c => (c.originality || 0) >= 40 && (c.originality || 0) < 70).length;
    const high = textChecks.filter(c => (c.originality || 0) < 40).length;
    if (!textChecks.length) return [{ name: 'Original', value: 60 }, { name: 'Moderate', value: 30 }, { name: 'High', value: 10 }];
    return [
      { name: 'Original', value: orig || 1 },
      { name: 'Moderate', value: mod || 1 },
      { name: 'High', value: high || 1 },
    ];
  }, [checks]);

  const recentChecks = checks.slice(0, 5);

  return (
    <div className="flex-col" style={{ height: '100%' }}>
      <TopBar
        title={user ? `Hi, ${user.name.split(' ')[0]} 👋` : 'Dashboard'}
        subtitle="Track originality and risk across your corpus."
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('library')}>Manage Library</button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('check')}>+ New Check</button>
          </>
        }
      />

      <div className="page-area">
        {/* Stats */}
        <div className="grid-4 mb-6 fade-in">
          <StatCard
            icon="⚡" label="Avg. Originality"
            value={`${stats.avg}%`}
            sub={`Across ${stats.totalChecks} checks`}
            color="var(--accent)"
          />
          <StatCard
            icon="📝" label="Words Analyzed"
            value={stats.totalWords.toLocaleString()}
            sub="Total volume"
            color="var(--accent-blue)"
          />
          <StatCard
            icon="🚩" label="Flagged Sentences"
            value={stats.flagged}
            sub="Across all checks"
            color="var(--warning)"
          />
          <StatCard
            icon="📚" label="Reference Corpus"
            value={library.length}
            sub="Source documents"
            color="var(--success)"
          />
        </div>

        {/* Charts */}
        <div className="grid-2 mb-6 fade-in-delay-1">
          <div className="card">
            <div className="mb-4">
              <div className="section-title" style={{ fontSize: 16 }}>Originality Trend</div>
              <div className="section-subtitle">Score improvement over time</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradOrig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Area type="monotone" dataKey="originality" stroke="#7C3AED" fill="url(#gradOrig)" strokeWidth={2} dot={{ fill: '#7C3AED', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-4">
              <div className="section-title" style={{ fontSize: 16 }}>Risk Distribution</div>
              <div className="section-subtitle">Breakdown across all checks</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={riskDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {riskDist.map((_, i) => <Cell key={i} fill={RISK_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {riskDist.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: RISK_COLORS[i], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: RISK_COLORS[i] }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Checks */}
        <div className="card fade-in-delay-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title" style={{ fontSize: 16 }}>Recent Checks</div>
              <div className="section-subtitle">Latest originality analyses</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('history')}>View All</button>
          </div>

          {recentChecks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>No checks yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Run your first analysis to see results here</div>
              <button className="btn btn-primary btn-sm mt-4" onClick={() => onNavigate('check')}>Run Analysis</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentChecks.map(c => {
                const badge = getRiskBadge(c.originality || 0);
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)', borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: c.type === 'code' ? 'rgba(59,130,246,0.15)' : 'rgba(124,58,237,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>{c.type === 'code' ? '💻' : '📄'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title || 'Untitled'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatDate(c.createdAt)} · {c.mode || 'fast'} mode · {(c.wordCount || 0).toLocaleString()} words
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: badge.cls.includes('success') ? 'var(--success)' : badge.cls.includes('warning') ? 'var(--warning)' : 'var(--danger)' }}>
                        {c.originality || 0}%
                      </div>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{icon}</div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
