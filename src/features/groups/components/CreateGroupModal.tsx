import { useMutation, useQueryClient } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { Users, FileAudio } from 'lucide-react';
import * as yup from 'yup';

import type { FormCreateGroup } from '../groups.types';

import { Button } from '@shared/components/Button/Button';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';

import spotifyIcon from '@/shared/icons/spotify-icon.svg';

import { getErrorMessage } from '@/shared/utils';
import { groupsApi } from '../groupsApi';

const schema = yup.object({
  name: yup
    .string()
    .required('Group name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  music_type: yup.string().oneOf(['spotify_only', 'mp3']).required('Type is required'),
});

type CreateGroupFormData = yup.InferType<typeof schema>;

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateGroupFormData>({
    resolver: yupResolver(schema),
    defaultValues: { name: '', music_type: 'mp3' },
  });

  const selectedMusicType = watch('music_type');

  const mutation = useMutation({
    mutationFn: (data: FormCreateGroup) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      reset();
      onClose();
      onSuccess?.();
    },
  });

  const onSubmit = (data: CreateGroupFormData) => {
    mutation.mutate({ name: String(data.name).trim(), music_type: data.music_type });
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Group" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <Users size={32} className="text-white" />
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Create a new group to sync music with your friends. Share the group code to invite others.
        </p>

        <div className="space-y-2">
          {/* Form Fields */}
          <div className="space-y-4">
            <Input
              {...register('name')}
              id="name"
              label="Name"
              error={errors.name?.message}
              disabled={mutation.isPending}
              value={watch('name') || ''}
              autoComplete="off"
              maxLength={50}
              countCharacters
              autoFocus
            />
          </div>
          {/* Music Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Music Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setValue('music_type', 'mp3', { shouldValidate: true })}
                disabled={mutation.isPending}
                className={`
                flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed focus:outline-blue-500
                ${
                  selectedMusicType === 'mp3'
                    ? 'border-blue-500 bg-blue-500/10 dark:border-blue-700 dark:bg-blue-500/10'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-dark-surface'
                }
              `}
              >
                <FileAudio size={28} className="text-primary-600 dark:text-primary-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-light-text dark:text-dark-text">
                    MP3
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-300 text-center">
                    Upload and sync your own files
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setValue('music_type', 'spotify_only', { shouldValidate: true })}
                disabled={mutation.isPending}
                className={`
                flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed focus:outline-blue-500
                ${
                  selectedMusicType === 'spotify_only'
                    ? 'border-blue-500 bg-blue-500/10 dark:border-blue-700 dark:bg-blue-500/10'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-dark-surface'
                }
              `}
              >
                <img src={spotifyIcon} alt="Spotify" className="w-7 h-7" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-light-text dark:text-dark-text">
                    Spotify Only
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-300 text-center">
                    Require subscription to Spotify Premium
                  </span>
                </div>
              </button>
            </div>
            {errors.music_type && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.music_type.message}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {mutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(mutation.error)}
            </p>
          </div>
        )}

        {/* Success Message */}
        {mutation.isSuccess && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-600 dark:text-green-400">
              Group created successfully!
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="min-w-[125px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            className="flex-1"
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
