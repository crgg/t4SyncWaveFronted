import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import { groupsApi } from '../groupsApi';
import type { FormCreateGroup } from '../groups.types';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { getErrorMessage } from '@/shared/utils';

const schema = yup.object({
  name: yup
    .string()
    .required('Group name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
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
  } = useForm<CreateGroupFormData>({
    resolver: yupResolver(schema),
  });

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
    mutation.mutate({ name: String(data.name).trim() });
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Group" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Icon/Illustration */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <Users size={32} className="text-white" />
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Create a new group to sync music with your friends. Share the group code to invite others.
        </p>

        {/* Form Fields */}
        <div className="space-y-4">
          <Input
            {...register('name')}
            label="Group Name"
            error={errors.name?.message}
            disabled={mutation.isPending}
            value={watch('name') || ''}
            autoComplete="off"
            maxLength={50}
            countCharacters
            autoFocus
          />
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
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
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
