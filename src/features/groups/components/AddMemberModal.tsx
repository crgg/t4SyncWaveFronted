import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';

import { groupsApi } from '../groupsApi';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { FormAddMemberToGroup } from '../groups.types';
import { getErrorMessage } from '@/shared/utils';

const schema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .max(100, 'Email must be less than 100 characters')
    .required('Email is required')
    .trim(),
  role: yup
    .string()
    .oneOf(['dj', 'member'], 'Role must be either "dj" or "member"')
    .required('Role is required'),
});

type AddMemberFormData = {
  email: string;
  role: 'dj' | 'member';
};

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
    clearErrors,
    watch,
  } = useForm<AddMemberFormData>({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      role: 'member',
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AddMemberFormData) => {
      const payload: FormAddMemberToGroup = {
        groupId,
        role: data.role,
        email: data.email,
      };
      return groupsApi.addMemberToGroup(payload);
    },
    onSuccess: () => {
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
    clearErrors();
    mutation.mutate(data);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Member" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <UserPlus size={32} className="text-white" />
          </div>
        </div>

        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Invite a user to join this group by email address
        </p>

        <div className="space-y-4">
          <Input
            {...register('email')}
            value={watch('email') || ''}
            label="Email Address"
            type="email"
            error={errors.email?.message}
            disabled={mutation.isPending}
            autoComplete="off"
            maxLength={100}
            countCharacters
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

        {mutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(mutation.error)}
            </p>
          </div>
        )}

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
