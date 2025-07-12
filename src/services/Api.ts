import axios from 'axios';

const api = axios.create({
  baseURL: 'https://backendbellteus-production-507e.up.railway.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Añadir interceptor para JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
