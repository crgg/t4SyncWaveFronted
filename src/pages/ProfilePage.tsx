import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';

import { profileService } from '@services/profile';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import { getErrorMessage, getInitials, validationIsObject } from '@/shared/utils';

const schema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  nickname: yup.string().optional(),
});

type ProfileFormData = yup.InferType<typeof schema>;

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: user?.name || '',
      nickname: user?.nickname || '',
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        nickname: user.nickname || '',
      });
      if (user.avatar_url) {
        setAvatarPreview(user.avatar_url);
      }
    }
  }, [user, reset]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await profileService.getProfile();
      if (!response.status) {
        throw new Error(getErrorMessage(response));
      }
      dispatch(authActions.updateUser(response.user));
      reset({
        name: response.user.name || '',
        nickname: response.user.nickname || '',
      });
      if (response.user.avatar_url) {
        setAvatarPreview(response.user.avatar_url);
      }
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error loading profile');
      } else {
        setError('Error loading profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await profileService.updateProfile(data);
      dispatch(authActions.updateUser(response.user));
      setSuccess('Profile updated successfully');
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

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-light-card dark:bg-dark-card rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">
              Profile Settings
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Manage your profile information and avatar
            </p>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white text-4xl font-bold">{getInitials(user?.name)}</div>
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
                className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 rounded-full text-white shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change avatar"
              >
                <Camera size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Click the camera icon to change your avatar
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover rounded-lg text-light-text-secondary dark:text-dark-text-secondary cursor-not-allowed opacity-60"
              />
              <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Email cannot be changed
              </p>
            </div>

            <Input
              label="Name"
              type="text"
              placeholder="Your full name"
              {...register('name')}
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

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Update Profile
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default ProfilePage;
