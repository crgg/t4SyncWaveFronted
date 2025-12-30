export const paths = {
  HOME: '/',
  GROUPS: (id: null | string = '/:groupId') => `/groups${id || ''}`,
  LISTENERS: (id: null | string = '/:groupId') => `/listeners${id || ''}`,
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
} as const;
