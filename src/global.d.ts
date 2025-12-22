export {};

declare global {
  interface ResponseBase {
    status: boolean;
  }
  interface IResponseBase<T> {
    status: boolean;
    data: T;
  }
  interface IUserData {
    id: string;
    name: string;
    email: string;
  }
}
