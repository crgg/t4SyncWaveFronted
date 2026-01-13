const AUTH = '/auth';

export const paths = {
  HOME: '/',
  GROUPS: (id: null | string = '/:groupId') => `/groups${id || ''}`,
  LISTENERS: (id: null | string = '/:groupId') => `/listeners${id || ''}`,
  LIBRARY: '/library',
  PROFILE: '/profile',
  INBOX: '/inbox',
  // Auth
  AUTH,
  LOGIN: `${AUTH}/login`,
  REGISTER: `${AUTH}/register`,
  PHONE_NUMBER: `${AUTH}/phone-number`,
  VERIFY_CODE: `${AUTH}/verify-code`,
  USERS_CHANGE_PASSWORD: `/users/change-password`,
  // Terms and Privacy
  TERMS: '/legal/terms',
  PRIVACY: '/legal/privacy',
} as const;
