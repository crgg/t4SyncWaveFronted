import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { KeyRound } from 'lucide-react';

import { groupsApi } from '@/features/groups/groupsApi';
import type { FormAddMemberToGroup } from '@/features/groups/groups.types';
import { Input } from '@/shared/components/Input/Input';
import { Button } from '@/shared/components/Button/Button';
import { getErrorMessage } from '@/shared/utils';

const joinGroupSchema = yup.object({
  code: yup
    .string()
    .min(6, 'Code must be at least 6 characters')
    .required('Group code is required'),
});

type JoinGroupFormData = {
  code: string;
};

interface JoinGroupByCodeProps {
  userId?: string;
}

export function JoinGroupByCode({ userId }: JoinGroupByCodeProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm<JoinGroupFormData>({
    resolver: yupResolver(joinGroupSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      code: '',
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: (data: JoinGroupFormData) => {
      const payload: FormAddMemberToGroup = {
        groupId: '', // El backend resolverá el grupo desde el código
        code: data.code.toUpperCase(),
        role: 'member',
      };
      return groupsApi.addMemberToGroupByCode(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', { userId }] });
      queryClient.invalidateQueries({ queryKey: ['others-groups', { userId }] });
      reset();
      toast.success('Successfully joined the group!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || 'Failed to join group');
    },
  });

  const onSubmit = (data: JoinGroupFormData) => {
    clearErrors();
    joinGroupMutation.mutate(data);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-primary dark:text-primary-light" />
            <h3 className="text-base font-semibold text-light-text dark:text-dark-text">
              Join Group by Code
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-300 mb-3">
            Enter a group code to join and start listening together.
          </p>
        </div>
        <div className="flex">
          <div className="flex-1">
            <Input
              {...register('code')}
              type="text"
              placeholder="Enter group code"
              error={errors.code?.message}
              disabled={joinGroupMutation.isPending}
              autoComplete="off"
              maxLength={6}
              className="uppercase rounded-r-none placeholder:capitalize"
              buttonEnd={
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={joinGroupMutation.isPending}
                  disabled={joinGroupMutation.isPending}
                  className="rounded-l-none min-w-24"
                >
                  <span className="text-xs font-semibold">Join</span>
                </Button>
              }
            />
          </div>
        </div>
        {joinGroupMutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(joinGroupMutation.error)}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
