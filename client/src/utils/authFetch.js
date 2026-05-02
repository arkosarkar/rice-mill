/**
 * authFetch.js — Drop-in replacement for native fetch() with auto-JWT injection.
 * It automatically adds the Authorization: Bearer <token> header and handles 401s.
 */

import { API_URL } from '../api/config';
import { notify } from '../components/ui/NotificationToast';

const TOKEN_KEY = 'erp_token';

export default async function authFetch(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  // If URL is relative (e.g. '/parties'), prefix it with API_URL
  const finalUrl = url.startsWith('http') ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(finalUrl, { ...options, headers });

    // Global 401 handling — fires the same event as axiosInstance
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('erp_unauthorized'));
    }

    // Handle Proxy/Gateway errors (Backend down)
    if (!response.ok && (response.status === 502 || response.status === 504)) {
      notify('Error connecting to backend. Please check if the server is running.', 'error');
    }

    return response;
  } catch (error) {
    // Catch network errors (server down, CORS, etc.)
    console.error('API Connection Error:', error);
    notify('Error connecting to backend. Please check if the server is running.', 'error');
    throw error; // Re-throw so callers can still handle it if needed
  }
}
