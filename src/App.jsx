import React, { useState, useEffect } from 'react';
import './styles/global.css';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TextAnalysis from './pages/TextAnalysis';
import CodeAnalysis from './pages/CodeAnalysis';
import History from './pages/History';
import Library from './pages/Library';
import { ToastContainer } from './utils/toast';
import { getSession, logout } from './utils/auth';

export default function App() {
  const [user, setUser] = useState(getSession());
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    if (!user) setPage('dashboard');
  }, [user]);

  function handleAuth(u) {
    setUser(u);
    setPage('dashboard');
  }

  function handleSignOut() {
    logout();
    setUser(null);
  }

  if (!user) {
    return (
      <>
        <Login onAuth={handleAuth} />
        <ToastContainer />
      </>
    );
  }

  const PAGES = {
    dashboard: Dashboard,
    check: TextAnalysis,
    code: CodeAnalysis,
    history: History,
    library: Library,
  };
  const Page = PAGES[page] || Dashboard;

  return (
    <>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar current={page} onNavigate={setPage} user={user} onSignOut={handleSignOut} />
        <div className="main-content">
          <Page onNavigate={setPage} user={user} key={user.id} />
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
