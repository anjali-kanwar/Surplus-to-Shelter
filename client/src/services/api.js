import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT as Bearer token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
