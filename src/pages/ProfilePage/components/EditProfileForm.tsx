import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';

const schema = yup.object({
  nickname: yup
    .string()
    .required('Display name is required')
    .max(50, 'Display name must be less than 50 characters'),
});

type ProfileFormData = yup.InferType<typeof schema>;

interface EditProfileFormProps {
  initialNickname: string;
  isLoading: boolean;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
}

export function EditProfileForm({
  initialNickname,
  isLoading,
  onSubmit,
  onCancel,
}: EditProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      nickname: initialNickname,
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30"
    >
      <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text mb-4">
        Edit Profile
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Display Name"
          description="This is the name that others will see in the groups."
          type="text"
          placeholder=""
          {...register('nickname')}
          error={errors.nickname?.message}
          maxLength={50}
          autoFocus
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="w-28 text-sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 text-sm max-w-56"
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
