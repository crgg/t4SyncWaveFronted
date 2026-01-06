import { http } from '@app/http';
import * as Types from '@shared/types/auth.types';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: IUserData;
  token: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await http.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await http.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getCode: async (data: Types.GetCodePayload): Promise<Types.GetCodeResponse> => {
    const response = await http.post<Types.GetCodeResponse>('/auth/otp/request', data);
    return response.data;
  },

  verifyCode: async (data: Types.VerifyCodePayload): Promise<Types.VerifyCodeResponse> => {
    const response = await http.post<Types.VerifyCodeResponse>('/auth/otp/verify', data);
    return response.data;
  },
};
