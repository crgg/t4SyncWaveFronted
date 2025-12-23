import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Modal } from '@shared/components/Modal/Modal';
import { Button } from '@shared/components/Button/Button';

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  modelNameValue: string;
  onSuccess?: () => void;
  mutationFn: (data: any) => Promise<any>;
  queryKeys: Array<Array<string>>;
  payload: any;
}

function DeleteDialogComponent({
  isOpen,
  onClose,
  modelName,
  onSuccess,
  mutationFn,
  queryKeys,
  payload,
  modelNameValue,
}: DeleteDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      onClose();
      onSuccess?.();
    },
  });

  const handleDelete = () => {
    mutation.mutate(payload);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Record" size="md">
      <div className="space-y-6">
        {/* Icon/Illustration */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center shadow-lg">
            <AlertTriangle size={32} className="text-white" />
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Are you sure you want to delete this {modelName}?
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            This action cannot be undone. The {modelName} <strong>"{modelNameValue}"</strong> and
            all its data will be permanently deleted.
          </p>
        </div>

        {/* Error Message */}
        {mutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof Error
                ? mutation.error.message
                : `Failed to delete ${modelName}. Please try again.`}
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
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDelete}
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DeleteDialog = (props: DeleteDialogProps) => {
  if (!props.isOpen) return null;
  return <DeleteDialogComponent {...props} />;
};

export default DeleteDialog;
