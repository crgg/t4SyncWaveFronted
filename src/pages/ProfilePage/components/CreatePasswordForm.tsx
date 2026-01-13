import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';

const createPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

type CreatePasswordFormData = yup.InferType<typeof createPasswordSchema>;

interface CreatePasswordFormProps {
  isLoading: boolean;
  onSubmit: (data: CreatePasswordFormData) => Promise<void>;
  onCancel: () => void;
}

export function CreatePasswordForm({ isLoading, onSubmit, onCancel }: CreatePasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePasswordFormData>({
    resolver: yupResolver(createPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30"
    >
      <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text mb-4">
        Create Password
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="New Password"
            type="password"
            {...register('newPassword')}
            error={errors.newPassword?.message}
          />

          <Input
            label="Confirm New Password"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="w-28 text-sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 text-sm max-w-56"
            isLoading={isLoading}
          >
            Save Password
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
