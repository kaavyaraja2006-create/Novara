// Simple localStorage-based auth for Novara

const USERS_KEY = 'novara_users';
const SESSION_KEY = 'novara_session';

export function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

export function registerUser(name, email, password) {
  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return { success: false, error: 'An account with this email already exists.' };

  const user = { id: Date.now().toString(), name, email, password };
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  setSession(user);
  return { success: true, user };
}

export function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return { success: false, error: 'Invalid email or password.' };
  setSession(user);
  return { success: true, user };
}

export function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
