import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, KeyRound } from 'lucide-react';

import { groupsApi } from '../groupsApi';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { FormAddMemberToGroup } from '../groups.types';
import { getErrorMessage } from '@/shared/utils';

type InviteMethod = 'email' | 'code';

const baseSchema = yup.object({
  email: yup.string().when('_method', {
    is: 'email',
    then: (schema) => schema.email('Invalid email address').required('Email is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  code: yup.string().when('_method', {
    is: 'code',
    then: (schema) =>
      schema.min(6, 'Code must be at least 6 characters').required('Group code is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  role: yup
    .string()
    .oneOf(['dj', 'member'], 'Role must be either "dj" or "member"')
    .required('Role is required'),
  _method: yup.string().oneOf(['email', 'code']).required(),
});

type AddMemberFormData = {
  email?: string;
  code?: string;
  role: 'dj' | 'member';
  _method: InviteMethod;
};

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess?: () => void;
}

export function AddMemberModal({ isOpen, onClose, groupId, onSuccess }: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    clearErrors,
  } = useForm<AddMemberFormData>({
    resolver: yupResolver(baseSchema) as any,
    mode: 'onSubmit', // Solo validar al hacer submit
    reValidateMode: 'onSubmit', // Solo re-validar al hacer submit
    defaultValues: {
      role: 'member',
      _method: 'email',
      email: '',
      code: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AddMemberFormData) => {
      const payload: FormAddMemberToGroup = {
        groupId,
        role: data.role,
      };
      if (data._method === 'email') {
        payload.email = data.email;
        return groupsApi.addMemberToGroup(payload);
      } else {
        payload.code = data.code;
        return groupsApi.addMemberToGroupByCode(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      reset();
      setInviteMethod('email');
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
      setInviteMethod('email');
      onClose();
    }
  };

  const handleMethodChange = (method: InviteMethod) => {
    setInviteMethod(method);
    setValue('_method', method);
    // Limpiar errores al cambiar de método
    clearErrors();
    // Clear the other field when switching methods
    if (method === 'email') {
      setValue('code', '');
      setValue('email', '');
    } else {
      setValue('email', '');
      setValue('code', '');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Member to Group" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <UserPlus size={32} className="text-white" />
          </div>
        </div>

        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Invite a user to join this group by email address or group code. You can assign them as a
          member or DJ.
        </p>

        <div className="flex gap-2 p-1 bg-light-surface dark:bg-dark-surface rounded-lg border border-light-hover dark:border-dark-hover">
          <button
            type="button"
            onClick={() => handleMethodChange('email')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              inviteMethod === 'email'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            }`}
            disabled={mutation.isPending}
          >
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => handleMethodChange('code')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              inviteMethod === 'code'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            }`}
            disabled={mutation.isPending}
          >
            <KeyRound size={16} />
            <span>Group Code</span>
          </button>
        </div>

        <input type="hidden" {...register('_method')} value={inviteMethod} />

        <div className="space-y-4">
          {inviteMethod === 'email' ? (
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
          ) : (
            <Input
              {...register('code')}
              label="Group Code"
              type="text"
              className="uppercase"
              placeholder="Enter group code"
              error={errors.code?.message}
              disabled={mutation.isPending}
              autoComplete="off"
              maxLength={10}
              autoFocus
            />
          )}

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
