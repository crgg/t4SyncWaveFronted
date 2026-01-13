import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';

const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

type ChangePasswordFormData = yup.InferType<typeof changePasswordSchema>;

interface ChangePasswordFormProps {
  isLoading: boolean;
  onSubmit: (data: ChangePasswordFormData) => Promise<void>;
  onCancel: () => void;
}

export function ChangePasswordForm({ isLoading, onSubmit, onCancel }: ChangePasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
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
        Change Password
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          {...register('currentPassword')}
          error={errors.currentPassword?.message}
        />

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
            Change Password
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
