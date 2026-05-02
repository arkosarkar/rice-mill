/**
 * axiosInstance.js
 * Axios instance with automatic JWT injection and global 401 handling.
 * Every API call in the app should import from here instead of bare axios.
 */
import axios from 'axios';

import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// ── Request Interceptor ────────────────────────────────────────────────────
// Automatically attach the Bearer token to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────
// Catch 401 globally: clear the stale token and signal the app to re-login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('erp_token');
      // Fire a custom event so AuthContext can react without a circular import
      window.dispatchEvent(new Event('erp_unauthorized'));
    } else if (!error.response || error.response.status === 502 || error.response.status === 504) {
      // Network Error or Proxy Error (server down)
      console.error('API Connection Error:', error);
      window.dispatchEvent(new CustomEvent('erp_notification', {
        detail: { message: 'Error connecting to backend. Please check if the server is running.', type: 'error' }
      }));
    }
    return Promise.reject(error);
  }
);

export default api;
