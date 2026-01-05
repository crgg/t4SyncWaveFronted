import { STORAGE_KEYS } from '@/shared/constants';

export const clearAuthStorageKeys = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
};
