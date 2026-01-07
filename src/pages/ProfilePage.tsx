import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { Camera, Loader2, Edit2, Mail, ArrowLeftCircle, Lock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { profileService } from '@services/profile';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import {
  formatPhoneNumber,
  getErrorMessage,
  getInitials,
  validationIsObject,
} from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import { withAuth } from '@/shared/hoc/withAuth';
import { paths } from '@/routes/paths';
import { toast } from 'react-toastify';

const schema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'Name can only contain letters, spaces, and accents')
    .test('no-double-spaces', 'Name cannot contain consecutive spaces', (value) => {
      return value ? !/\s{2,}/.test(value) : true;
    }),
  nickname: yup.string().optional(),
});

type ProfileFormData = yup.InferType<typeof schema>;

const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

type ChangePasswordFormData = yup.InferType<typeof changePasswordSchema>;

const changeEmailSchema = yup.object({
  email: yup.string().required('Email is required').email('Please enter a valid email address'),
});

type ChangeEmailFormData = yup.InferType<typeof changeEmailSchema>;

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
  const [isChangeEmailMode, setIsChangeEmailMode] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: user?.name || '',
      nickname: user?.nickname || '',
    },
  });

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    value = value.replace(/\s{2,}/g, ' ');

    setValue('name', value, { shouldValidate: true });
  };

  const nameRegister = register('name');

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    reset: resetEmail,
  } = useForm<ChangeEmailFormData>({
    resolver: yupResolver(changeEmailSchema),
    defaultValues: {
      email: user?.email || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        nickname: user.nickname || '',
      });
      resetEmail({
        email: user.email || '',
      });
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      }
    }
  }, [user, reset, resetEmail]);

  const onSubmit = async (data: ProfileFormData) => {
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
      // clear my group query
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
      resetPassword();
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

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-light-text dark:text-dark-text">
            Profile
          </h1>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors touch-manipulation active:scale-95"
            aria-label="Edit profile"
          >
            <Edit2 size={20} className="text-primary dark:text-primary-light" />
          </button>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="relative flex-shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">
                    {user?.name ? getInitials(user?.name) : '?'}
                  </div>
                )}
                {isLoadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={24} />
                  </div>
                )}
              </div>

              <button
                onClick={handleAvatarClick}
                disabled={isLoadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 sm:w-9 sm:h-9 bg-white dark:bg-dark-card rounded-full flex items-center justify-center shadow-lg border-2 border-light-bg dark:border-dark-bg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Change avatar"
              >
                <Camera size={14} className="text-primary dark:text-primary-light" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text mb-1">
                {user?.name || 'User'}
              </h2>
              {user?.nickname && (
                <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  @{user.nickname}
                </p>
              )}
              <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 sm:p-4 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 sm:p-4 rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30"
          >
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </motion.div>
        )}

        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
            Account
          </h3>
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 space-y-2 border border-light-hover/30 dark:border-dark-hover/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
                <Mail size={18} className="text-primary dark:text-primary-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
                  Email
                </p>
                <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                  {user?.email ?? '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
                <Phone size={18} className="text-primary dark:text-primary-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
                  Phone
                </p>
                <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                  {user?.phone ? formatPhoneNumber(user?.phone) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
            Actions
          </h3>
          <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover/30 dark:border-dark-hover/30 overflow-hidden">
            <button
              onClick={() => setIsChangeEmailMode(!isChangeEmailMode)}
              className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
            >
              <Mail size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
              <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
                Edit Email
              </span>
            </button>

            {/* Edit Profile */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
            >
              <Edit2 size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
              <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
                Edit Profile
              </span>
            </button>

            {/* Change Avatar */}
            <button
              onClick={handleAvatarClick}
              disabled={isLoadingAvatar}
              className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
              <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
                Change Avatar
              </span>
            </button>

            {/* Change Password */}
            {!user?.phone && (
              <button
                onClick={() => setIsChangePasswordMode(!isChangePasswordMode)}
                className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
              >
                <Lock size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
                  Change Password
                </span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={() => handleLogout()}
              className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98]"
            >
              <ArrowLeftCircle
                size={20}
                className="text-primary dark:text-primary-light flex-shrink-0"
              />
              <span className="text-sm sm:text-base font-medium text-red-600 dark:text-red-400">
                Logout
              </span>
            </button>
          </div>
        </div>

        {/* Edit Form Modal/Card */}
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30"
          >
            <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text mb-4">
              Edit Profile
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Name"
                type="text"
                placeholder="Your full name"
                {...nameRegister}
                onChange={(e) => {
                  nameRegister.onChange(e);
                  handleNameInput(e);
                }}
                error={errors.name?.message}
                maxLength={100}
              />

              <Input
                label="Nickname (Optional)"
                type="text"
                placeholder="Your nickname"
                {...register('nickname')}
                error={errors.nickname?.message}
                maxLength={50}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditMode(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Change Password Form */}
        {isChangePasswordMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30"
          >
            <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text mb-4">
              Change Password
            </h3>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
                {...registerPassword('currentPassword')}
                error={passwordErrors.currentPassword?.message}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Enter your new password"
                {...registerPassword('newPassword')}
                error={passwordErrors.newPassword?.message}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm your new password"
                {...registerPassword('confirmPassword')}
                error={passwordErrors.confirmPassword?.message}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsChangePasswordMode(false);
                    resetPassword();
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoadingPassword}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Change Email Form */}
        {isChangeEmailMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30"
          >
            <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text mb-4">
              Change Email
            </h3>
            <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-4">
              <div className="p-3 bg-light-hover/20 dark:bg-dark-hover/30 rounded-lg mb-2">
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  Current Email
                </p>
                <p className="text-sm font-medium text-light-text dark:text-dark-text">
                  {user?.email}
                </p>
              </div>

              <Input
                label="New Email"
                type="email"
                placeholder="Enter your new email address"
                {...registerEmail('email')}
                error={emailErrors.email?.message}
                autoComplete="email"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsChangeEmailMode(false);
                    resetEmail({ email: user?.email || '' });
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoadingEmail}
                >
                  Update Email
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default withAuth(ProfilePage);
