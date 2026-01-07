import axios, { AxiosResponse } from 'axios';

import { API_BASE_URL, STORAGE_KEYS } from '@shared/constants';
import { clearAuthStorageKeys } from '@/features/auth/helpers';
import { paths } from '@/routes/paths';

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

const PATHS_TO_SKIP_AUTH = [
  paths.LOGIN,
  paths.VERIFY_CODE,
  paths.PROFILE,
  paths.USERS_CHANGE_PASSWORD,
];

http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorageKeys();
      if (!PATHS_TO_SKIP_AUTH.includes(error.response?.config?.url || '')) {
        window.location.href = paths.AUTH;
      }
    }
    return Promise.reject(error);
  }
);
