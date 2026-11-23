import axios from 'axios';
import Cookies from 'js-cookie';

const defaultApiOrigin = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5087'
  : 'https://api.cjmcanelas.shop';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_ORIGIN || defaultApiOrigin).replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = Cookies.get('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error?.response?.status === 401 &&
      window.location.pathname !== '/auth/login'
    ) {
      Cookies.remove('auth_token', { path: '/' });
      window.location.assign('/auth/login?session=expired');
    }

    return Promise.reject(error);
  },
);
