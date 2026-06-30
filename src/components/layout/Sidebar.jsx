import React, { useState } from 'react';
import { getInitials } from '../../utils/auth';

const NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'check', icon: '📄', label: 'Text Analysis' },
  { id: 'code', icon: '💻', label: 'Code Analysis' },
  { id: 'history', icon: '🕘', label: 'History' },
  { id: 'library', icon: '📚', label: 'Reference Library' },
];

export default function Sidebar({ current, onNavigate, user, onSignOut }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 300ms ease',
      flexShrink: 0, zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 16px' : '24px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--grad-primary)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
            }}>N</div>
            <span style={{ fontSize: 18, fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Novara
            </span>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 32, height: 32,
            background: 'var(--grad-primary)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
          }}>N</div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 6, width: 28, height: 28,
            cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                border: active ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                borderRadius: 10,
                cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font)',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                marginBottom: 2,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && (
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '8px' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            marginBottom: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>{getInitials(user.name)}</div>
            {!collapsed && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 10,
            cursor: 'pointer',
            color: 'var(--danger)',
            fontFamily: 'var(--font)',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 15 }}>🚪</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
