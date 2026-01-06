export interface GetCodePayload {
  phone: string;
}

export interface VerifyCodePayload extends GetCodePayload {
  code: string;
}

export interface GetCodeResponse extends ResponseBase {
  message: string;
  phone: string;
}

export interface VerifyCodeResponse extends ResponseBase {
  message: string;
  user: IUserData;
  token: string;
}
