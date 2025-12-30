export {};

declare global {
  interface ResponseBase {
    status: boolean;
    error?: string;
  }
  interface IResponseBase<T> {
    status: boolean;
    data: T;
  }
  interface IUserData {
    id: string;
    name: string;
    nickname?: string;
    email: string;
    avatar_url?: string;
    created_at?: string;
  }
}
