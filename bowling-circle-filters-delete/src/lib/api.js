const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const register = (email, password) =>
  apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const submitForm = (data) =>
  apiFetch('/submit', { method: 'POST', body: JSON.stringify(data) });

export const getMyProfile = () => apiFetch('/me/profile');

export const getGuestProfile = (id, key) =>
  apiFetch(`/profile/${id}?key=${encodeURIComponent(key)}`);

export const getUsers = (params = {}) =>
  apiFetch('/admin/users?' + new URLSearchParams(params));

export const deleteUser = (id) =>
  apiFetch(`/admin/users/${id}`, { method: 'DELETE' });

export const getAccounts = () => apiFetch('/admin/accounts');

export const setAccountRole = (id, role) =>
  apiFetch(`/admin/accounts/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });

export const createSession = (data) =>
  apiFetch('/admin/sessions', { method: 'POST', body: JSON.stringify(data) });

export const getSessions = () => apiFetch('/admin/sessions');

export const getSession = (id) => apiFetch(`/admin/sessions/${id}`);

export const updateSession = (id, data) =>
  apiFetch(`/admin/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
