import { auth } from '../lib/firebase';

async function apiFetch(path, options = {}) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const addTrack = (tiktokUrl) =>
  apiFetch('/tracks', { method: 'POST', body: JSON.stringify({ tiktokUrl }) });

export const deleteTrack = (trackId) =>
  apiFetch(`/tracks/${trackId}`, { method: 'DELETE' });

export const uploadTrack = (audioBase64, fileName) =>
  apiFetch('/upload', { method: 'POST', body: JSON.stringify({ audioBase64, fileName }) });
