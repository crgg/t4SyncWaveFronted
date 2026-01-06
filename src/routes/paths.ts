const AUTH = '/auth';

export const paths = {
  HOME: '/',
  GROUPS: (id: null | string = '/:groupId') => `/groups${id || ''}`,
  LISTENERS: (id: null | string = '/:groupId') => `/listeners${id || ''}`,
  PROFILE: '/profile',
  // Auth
  AUTH,
  LOGIN: `${AUTH}/login`,
  REGISTER: `${AUTH}/register`,
  PHONE_NUMBER: `${AUTH}/phone-number`,
  VERIFY_CODE: `${AUTH}/verify-code`,
  // Terms and Privacy
  TERMS: '/#terms',
  PRIVACY: '/#privacy',
} as const;
