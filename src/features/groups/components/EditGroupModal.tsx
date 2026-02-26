import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2 } from 'lucide-react';

import { groupsApi } from '../groupsApi';
import type { IPayloadUpdateGroup } from '../groups.types';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';

const schema = yup.object({
  name: yup
    .string()
    .required('Group name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
});

type EditGroupFormData = yup.InferType<typeof schema>;

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentName: string;
  onSuccess?: () => void;
}

export function EditGroupModal({
  isOpen,
  onClose,
  groupId,
  currentName,
  onSuccess,
}: EditGroupModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditGroupFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: currentName,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: IPayloadUpdateGroup) => groupsApi.updateGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['others-groups'] });
      reset();
      onClose();
      onSuccess?.();
    },
  });

  const onSubmit = (data: EditGroupFormData) => {
    mutation.mutate({ id: groupId, name: String(data.name).trim() });
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Group" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <Edit2 size={32} className="text-white" />
          </div>
        </div>

        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Update your group name. Changes will be reflected immediately.
        </p>

        <div className="space-y-4">
          <Input
            {...register('name')}
            label="Group Name"
            error={errors.name?.message}
            disabled={mutation.isPending}
            autoComplete="off"
            maxLength={50}
            value={watch('name') || ''}
            countCharacters
            autoFocus
          />
        </div>

        {mutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to update group. Please try again.'}
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
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
