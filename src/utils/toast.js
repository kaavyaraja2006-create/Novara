import React, { useState, useEffect, useCallback } from 'react';

let _addToast = null;

export function toast(message, type = 'success') {
  if (_addToast) _addToast({ message, type, id: Date.now() });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000);
  }, []);

  useEffect(() => { _addToast = addToast; return () => { _addToast = null; }; }, [addToast]);

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const colors = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--info)', warning: 'var(--warning)' };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--bg-card-elevated)',
          border: `1px solid ${colors[t.type]}33`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.3s ease forwards',
          minWidth: 220, maxWidth: 320,
        }}>
          <span style={{ color: colors[t.type], fontWeight: 700, fontSize: 16 }}>{icons[t.type]}</span>
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
