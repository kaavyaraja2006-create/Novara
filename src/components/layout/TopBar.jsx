import React from 'react';

export default function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{
      padding: '16px 32px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(11,17,32,0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
