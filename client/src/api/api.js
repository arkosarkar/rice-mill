import axios from 'axios';
import { API_URL } from './config';

// Create Axios Instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios Request Interceptor — Injects Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios Response Interceptor — Handles Unauthorized (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('erp_token');
      window.dispatchEvent(new Event('erp_unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * fetchPLStatement — Fetches the P&L data using the interceptor
 */
export const fetchPLStatement = async (fromDate, toDate) => {
  try {
    const response = await api.get('/accounts/pl-statement', {
      params: { fromDate, toDate },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch P&L:', error);
    throw error;
  }
};

/**
 * fetchExpenses — Fetches all expense records
 */
export const fetchExpenses = async () => {
  try {
    const response = await api.get('/expenses');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    throw error;
  }
};

/**
 * saveExpense — Saves a new expense entry
 */
export const saveExpense = async (payload) => {
  try {
    const response = await api.post('/expenses', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to save expense:', error);
    throw error;
  }
};

/**
 * deleteExpense — Deletes an expense entry by ID
 */
export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete expense:', error);
    throw error;
  }
};

export default api;
