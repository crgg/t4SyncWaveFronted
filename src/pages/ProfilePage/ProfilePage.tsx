import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import * as Page from '@/shared/components/Page/Page';
import { profileService } from '@services/profile';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import { getErrorMessage, validationIsObject } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import { withAuth } from '@/shared/hoc/withAuth';
import { paths } from '@/routes/paths';
import {
  ProfileHeader,
  AccountInfo,
  ProfileActions,
  EditProfileForm,
  ChangePasswordForm,
  ChangeEmailForm,
  ProfileMessages,
} from './components';
import { CreatePasswordForm } from './components/CreatePasswordForm';

type ProfileFormData = {
  nickname: string;
};

type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type CreatePasswordFormData = {
  newPassword: string;
  confirmPassword: string;
};

type ChangeEmailFormData = {
  email: string;
};

function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);
  const [isCreatePasswordMode, setIsCreatePasswordMode] = useState(false);
  const [isChangeEmailMode, setIsChangeEmailMode] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      }
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload avatar
    setIsLoadingAvatar(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await profileService.uploadAvatar(file);
      dispatch(authActions.updateUser(response.user));
      setSuccess('Avatar updated successfully');
      queryClient.invalidateQueries({ queryKey: ['groups', { userId: user?.id }] });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error uploading avatar');
      } else {
        setError(getErrorMessage(err));
      }
      // Reset preview on error
      setAvatarPreview(user?.avatar_url || null);
    } finally {
      setIsLoadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogout = (path: string = paths.AUTH) => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    navigate(path);
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await profileService.updateProfile(data);
      dispatch(authActions.updateUser(response.user));
      setSuccess('Profile updated successfully');
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['groups', { userId: user?.id }] });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error updating profile');
      } else {
        setError('Error updating profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPassword = async (data: ChangePasswordFormData) => {
    setIsLoadingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      await profileService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess('Password changed successfully');
      setIsChangePasswordMode(false);
      toast.success('Password changed successfully, please login again');
      handleLogout(paths.LOGIN);
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error changing password');
      } else {
        setError('Error changing password');
      }
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const onCreatePassword = async (data: CreatePasswordFormData) => {
    setIsLoadingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      await profileService.createPassword({
        newPassword: data.newPassword,
      });
      setSuccess('Password created successfully');
      setIsCreatePasswordMode(false);
      toast.success('Password created successfully, please login again');
      handleLogout(paths.LOGIN);
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error creating password');
      } else {
        setError('Error creating password');
      }
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const onSubmitEmail = async (data: ChangeEmailFormData) => {
    setIsLoadingEmail(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await profileService.updateEmail({ email: data.email });
      dispatch(authActions.updateUser(response.user));
      setSuccess('Email updated successfully');
      setIsChangeEmailMode(false);
      queryClient.invalidateQueries({ queryKey: ['groups', { userId: user?.id }] });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error updating email');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const hasEmail = !!user?.email;
  const enableActions =
    !isEditMode && !isChangePasswordMode && !isChangeEmailMode && !isCreatePasswordMode;

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <Page.Wrapper>
      <Page.Title title="Profile" description="Manage your profile information" />
      <div className="space-y-6">
        <ProfileHeader
          user={user}
          avatarPreview={avatarPreview}
          isLoadingAvatar={isLoadingAvatar}
          fileInputRef={fileInputRef}
          onAvatarChange={handleAvatarChange}
        />

        <ProfileMessages error={error} success={success} />

        <AccountInfo user={user} />

        {enableActions && (
          <ProfileActions
            user={user}
            hasEmail={hasEmail}
            isLoadingAvatar={isLoadingAvatar}
            onEditProfile={() => setIsEditMode(true)}
            onAvatarClick={handleAvatarClick}
            onAddEmail={() => setIsChangeEmailMode(true)}
            onChangePassword={() => setIsChangePasswordMode(true)}
            onCreatePassword={() => setIsCreatePasswordMode(true)}
            onLogout={() => handleLogout()}
          />
        )}

        {isEditMode && (
          <EditProfileForm
            initialNickname={user?.nickname || ''}
            isLoading={isLoading}
            onSubmit={onSubmitProfile}
            onCancel={() => {
              setIsEditMode(false);
              setError(null);
            }}
          />
        )}

        {isChangePasswordMode && (
          <ChangePasswordForm
            isLoading={isLoadingPassword}
            onSubmit={onSubmitPassword}
            onCancel={() => {
              setIsChangePasswordMode(false);
              setError(null);
            }}
          />
        )}

        {isCreatePasswordMode && (
          <CreatePasswordForm
            isLoading={isLoadingPassword}
            onSubmit={onCreatePassword}
            onCancel={() => {
              setIsCreatePasswordMode(false);
              setError(null);
            }}
          />
        )}

        {isChangeEmailMode && (
          <ChangeEmailForm
            user={user}
            hasEmail={hasEmail}
            isLoading={isLoadingEmail}
            onSubmit={onSubmitEmail}
            onCancel={() => {
              setIsChangeEmailMode(false);
              setError(null);
            }}
          />
        )}
      </div>
    </Page.Wrapper>
  );
}

export default withAuth(ProfilePage);
