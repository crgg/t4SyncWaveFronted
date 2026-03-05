import axios, { AxiosResponse } from 'axios';

import { SPOTIFY_BASE_URL, STORAGE_KEYS } from '@shared/constants';
import { clearAuthStorageKeys } from '@/features/auth/helpers';
import { paths } from '@/routes/paths';

const sanitizeUrl = (url: string) => {
  return url.replace(/\/$/, '');
};

export const httpSpotify = axios.create({
  baseURL: sanitizeUrl(SPOTIFY_BASE_URL),
});

httpSpotify.interceptors.request.use((config) => {
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
  '/api/auth/otp/verify',
];

httpSpotify.interceptors.response.use(
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
