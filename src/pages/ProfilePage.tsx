import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import {
  Camera,
  Loader2,
  Edit2,
  Mail,
  ArrowLeftCircle,
  Lock,
  Phone,
  TriangleAlert,
  ShieldCheck,
  MailPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import * as Page from '@/shared/components/Page/Page';
import { profileService } from '@services/profile';
import { Input } from '@shared/components/Input/Input';
import { btnColors, Button } from '@shared/components/Button/Button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import {
  cn,
  extractCharacters,
  formatPhoneNumber,
  getErrorMessage,
  getInitials,
  validationIsObject,
} from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import { withAuth } from '@/shared/hoc/withAuth';
import { paths } from '@/routes/paths';

const schema = yup.object({
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
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      nickname: user?.nickname || '',
    },
  });

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
      reset({ nickname: user.nickname || '' });
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

  const hasEmail = !!user?.email;

  const signedWithEmail = user?.authProviders[0] === 'email';

  const enableActions = !isEditMode && !isChangePasswordMode && !isChangeEmailMode;

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
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative flex-shrink-0">
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex items-center justify-center">
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
                className="absolute bottom-0 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white dark:bg-dark-card rounded-full flex items-center justify-center shadow-lg border-2 border-light-bg dark:border-dark-bg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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

            <div className="flex-1 min-w-0 flex flex-col gap-0 justify-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
                {user?.name || 'User'}
              </h2>
              {user?.nickname && (
                <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary">
                  @{user.nickname}
                </p>
              )}
              <p className="text-[10px] sm:text-xs text-zinc-400 mt-1 dark:text-zinc-400">
                {signedWithEmail
                  ? 'Session started with email'
                  : 'Signed in with phone verification'}
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
        <div className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400">
            Account
          </h3>
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 space-y-2 border border-light-hover/30 dark:border-dark-hover/30">
            {user?.email ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
                  <Mail size={18} className="text-primary dark:text-primary-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
                    Email
                  </p>
                  <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : user?.phone ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
                  <Phone size={18} className="text-primary dark:text-primary-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
                    Phone
                  </p>
                  <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                    {formatPhoneNumber(extractCharacters(user.phone, -10))}
                  </p>
                </div>
                <div>
                  <div
                    className={cn(
                      btnColors.emerald,
                      'py-1 flex items-center justify-center gap-1 px-3 rounded-full pointer-events-none'
                    )}
                  >
                    <ShieldCheck size={18} strokeWidth={3} className="mx-auto" />
                    <span className="hidden sm:inline font-bold">Verified</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {enableActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-1"
          >
            <h3 className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400">
              Actions
            </h3>
            <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover/30 dark:border-dark-hover/30 overflow-hidden">
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

              {/* Add/Edit Email */}
              {!hasEmail && hasEmail && (
                <button
                  onClick={() => setIsChangeEmailMode(!isChangeEmailMode)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
                >
                  {hasEmail ? (
                    <Mail
                      size={20}
                      className="text-primary dark:text-primary-light flex-shrink-0"
                    />
                  ) : (
                    <MailPlus
                      size={20}
                      className="text-primary dark:text-primary-light flex-shrink-0"
                    />
                  )}
                  <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
                    {hasEmail ? 'Edit' : 'Add'} Email
                  </span>
                </button>
              )}

              {user?.hasPassword && (
                <button
                  onClick={() => {
                    if (!hasEmail) return;
                    setIsChangePasswordMode(!isChangePasswordMode);
                  }}
                  disabled={!hasEmail}
                  className="disabled:cursor-not-allowed flex items-center gap-3 w-full p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
                >
                  {hasEmail ? (
                    <Lock
                      size={20}
                      className="text-primary dark:text-primary-light flex-shrink-0"
                    />
                  ) : (
                    <TriangleAlert
                      size={20}
                      className="text-zinc-500 dark:text-zinc-400 flex-shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          'text-sm sm:text-base font-medium',
                          hasEmail
                            ? 'text-primary dark:text-primary-light'
                            : 'text-zinc-500 dark:text-zinc-400'
                        )}
                      >
                        Change Password
                      </span>
                    </div>
                    {!hasEmail && (
                      <div className="text-xs text-start text-zinc-500 dark:text-zinc-400">
                        <p>Do you want to change your password?</p>
                        <p>You must set up an email address.</p>
                      </div>
                    )}
                  </div>
                </button>
              )}

              {/* Logout */}
              <button
                onClick={() => handleLogout()}
                className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98]"
              >
                <ArrowLeftCircle
                  size={20}
                  className="text-red-600 dark:text-red-400 flex-shrink-0"
                />
                <span className="text-sm sm:text-base font-medium text-red-600 dark:text-red-400">
                  Logout
                </span>
              </button>
            </div>
          </motion.div>
        )}

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
                label="Display Name"
                description="This is the name that others will see in the groups."
                type="text"
                placeholder=""
                {...register('nickname')}
                error={errors.nickname?.message}
                maxLength={50}
                autoFocus
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
            <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text mb-2">
              {hasEmail ? 'Change' : 'Add'} Email
            </h3>
            {!hasEmail && (
              <div className="pb-4">
                <h4 className="text-sm sm:text-base font-bold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Benefits of adding email:
                </h4>
                <ul className="list-disc list-inside text-xs sm:text-sm dark:text-zinc-300">
                  <li>Password reset option.</li>
                  <li>Receive group invitations.</li>
                  <li>Enhanced account security.</li>
                  <li>And more...</li>
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-4">
              {hasEmail && (
                <div className="p-3 bg-light-hover/20 dark:bg-dark-hover/30 rounded-lg mb-2">
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Current Email
                  </p>
                  <p className="text-sm font-medium text-light-text dark:text-dark-text">
                    {user?.email}
                  </p>
                </div>
              )}

              <Input
                label="New Email"
                type="email"
                placeholder="Enter your new email address"
                {...registerEmail('email')}
                error={emailErrors.email?.message}
                autoComplete="email"
                autoFocus
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
      </div>
    </Page.Wrapper>
  );
}

export default withAuth(ProfilePage);
