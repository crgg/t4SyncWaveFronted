import { http } from '@app/http';

export interface ProfileResponse {
  status: boolean;
  error?: string;
  msg?: string;
  user: IUserData;
}

export interface UpdateProfileData {
  nickname?: string;
  name: string;
}

export interface UpdateProfileResponse {
  status: boolean;
  message: string;
  user: IUserData;
}

export interface UploadAvatarResponse {
  status: boolean;
  message: string;
  avatar_url: string;
  user: IUserData;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  status: boolean;
  message: string;
}

export interface UpdateEmailData {
  email: string;
}

export interface UpdateEmailResponse {
  status: boolean;
  message: string;
  user: IUserData;
}

export interface CreatePasswordData {
  newPassword: string;
}

export interface CreatePasswordResponse {
  status: boolean;
  message: string;
}
export const profileService = {
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await http.get<ProfileResponse>('/users/me');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
    const response = await http.put<UpdateProfileResponse>('/users/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<UploadAvatarResponse> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await http.post<UploadAvatarResponse>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  changePassword: async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
    const response = await http.put<ChangePasswordResponse>('/users/change-password', data);
    return response.data;
  },

  createPassword: async (data: CreatePasswordData): Promise<CreatePasswordResponse> => {
    const response = await http.put<CreatePasswordResponse>('/users/create-password', data);
    return response.data;
  },

  updateEmail: async (data: UpdateEmailData): Promise<UpdateEmailResponse> => {
    const response = await http.post<UpdateEmailResponse>('/users/email', data);
    return response.data;
  },
};
