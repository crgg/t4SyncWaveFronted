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
  // Terms and Privacy
  TERMS: '/#terms',
  PRIVACY: '/#privacy',
} as const;
