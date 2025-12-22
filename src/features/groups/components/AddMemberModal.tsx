import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';

import { groupsApi } from '../groupsApi';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';

const schema = yup.object({
  email: yup.string().email('Invalid email address').required('Email is required'),
  role: yup
    .string()
    .oneOf(['dj', 'member'], 'Role must be either "dj" or "member"')
    .required('Role is required'),
});

type AddMemberFormData = yup.InferType<typeof schema>;

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess?: () => void;
}

export function AddMemberModal({ isOpen, onClose, groupId, onSuccess }: AddMemberModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddMemberFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      role: 'member',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AddMemberFormData) =>
      groupsApi.addMemberToGroup({
        groupId,
        email: data.email,
        role: data.role,
      }),
    onSuccess: () => {
      // Invalidar la query del grupo para refrescar los miembros
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      reset();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error al agregar miembro al grupo:', error);
    },
  });

  const onSubmit = (data: AddMemberFormData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Member to Group" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Icon/Illustration */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <UserPlus size={32} className="text-white" />
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Invite a user to join this group by entering their email address. You can assign them as a
          member or DJ.
        </p>

        {/* Form Fields */}
        <div className="space-y-4">
          <Input
            {...register('email')}
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            error={errors.email?.message}
            disabled={mutation.isPending}
            autoComplete="off"
            maxLength={100}
            autoFocus
          />

          <div className="hidden">
            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <input
                  {...register('role')}
                  type="radio"
                  value="member"
                  disabled={mutation.isPending}
                  className="peer sr-only"
                />
                <div className="flex items-center justify-center p-4 rounded-lg border-2 border-light-hover dark:border-dark-hover bg-light-surface dark:bg-dark-surface cursor-pointer transition-all peer-checked:border-primary-600 peer-checked:bg-primary-600/10 peer-checked:text-primary-600 dark:peer-checked:text-primary-400 hover:border-primary-600/50">
                  <span className="text-sm font-medium">Member</span>
                </div>
              </label>
              <label className="relative">
                <input
                  {...register('role')}
                  type="radio"
                  value="dj"
                  disabled={mutation.isPending}
                  className="peer sr-only"
                />
                <div className="flex items-center justify-center p-4 rounded-lg border-2 border-light-hover dark:border-dark-hover bg-light-surface dark:bg-dark-surface cursor-pointer transition-all peer-checked:border-primary-600 peer-checked:bg-primary-600/10 peer-checked:text-primary-600 dark:peer-checked:text-primary-400 hover:border-primary-600/50">
                  <span className="text-sm font-medium">DJ</span>
                </div>
              </label>
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.role.message}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {mutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to add member. Please try again.'}
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
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
