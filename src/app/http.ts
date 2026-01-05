import axios from 'axios';

import { API_BASE_URL, STORAGE_KEYS } from '@shared/constants';

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

// http.interceptors.response.use((response) => {
//   // console.log({ response });
//   return response;
// });
