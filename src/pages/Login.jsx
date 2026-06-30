import React, { useState } from 'react';
import { registerUser, loginUser } from '../utils/auth';
import { toast } from '../utils/toast';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (mode === 'register' && !form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = mode === 'register'
        ? registerUser(form.name.trim(), form.email.trim(), form.password)
        : loginUser(form.email.trim(), form.password);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      toast(`Welcome${mode === 'register' ? '' : ' back'}, ${result.user.name}!`, 'success');
      onAuth(result.user);
      setLoading(false);
    }, 500);
  }

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 24px' }}>
        {/* Logo */}
        <div className="fade-in" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            background: 'var(--grad-primary)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          }}>N</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Novara
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>AI Originality & Plagiarism Platform</p>
        </div>

        {/* Card */}
        <div className="card-glass fade-in-delay-1" style={{ padding: 32, borderRadius: 'var(--radius-xl)' }}>
          {/* Tabs */}
          <div className="mode-toggle mb-6">
            <button className={`mode-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
              Sign In
            </button>
            <button className={`mode-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="mb-4">
                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Full Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="mb-4">
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="mb-6">
              <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--danger)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ padding: '13px 24px', fontSize: 15, justifyContent: 'center' }}
              disabled={loading}
            >
              {loading
                ? (mode === 'register' ? 'Creating account…' : 'Signing in…')
                : (mode === 'register' ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('register')}>
                  Create one
                </span>
              </>
            ) : (
              <>Already have an account?{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('login')}>
                  Sign in
                </span>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)', marginTop: 24 }}>
          Your data is stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
