export {};

declare global {
  interface ResponseBase {
    status: boolean;
    error?: string;
  }

  interface IResponseErrorBase {
    status: boolean;
    error: string;
    msg?: string;
  }

  interface IResponseBase<T> {
    status: boolean;
    data: T;
  }

  interface IUserData {
    authProviders: Array<'email' | 'phone'>;
    hasPassword: boolean;
    id: string;
    name: string | null;
    nickname?: string;
    email: string | null;
    phone?: string;
    avatar_url?: string;
    created_at?: string;
    displayName: string;
  }

  type TDialogVariant = 'red' | 'emerald';
}
