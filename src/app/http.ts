import axios, { AxiosResponse } from 'axios';

import { API_BASE_URL, STORAGE_KEYS } from '@shared/constants';
import { clearAuthStorageKeys } from '@/features/auth/helpers';

const sanitizeUrl = (url: string) => {
  return url.replace(/\/$/, '');
};

export const http = axios.create({
  baseURL: sanitizeUrl(API_BASE_URL + '/api'),
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorageKeys();
      if (error.response?.config?.url !== '/auth/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
