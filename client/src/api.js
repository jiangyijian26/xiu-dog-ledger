const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getToken() {
  return localStorage.getItem('xiu_token');
}

export function setSession(session) {
  localStorage.setItem('xiu_token', session.token);
  localStorage.setItem('xiu_user', JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem('xiu_token');
  localStorage.removeItem('xiu_user');
}

export function getStoredUser() {
  const raw = localStorage.getItem('xiu_user');
  return raw ? JSON.parse(raw) : null;
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}
