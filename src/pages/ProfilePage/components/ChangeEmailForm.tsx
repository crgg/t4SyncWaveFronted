import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';

const changeEmailSchema = yup.object({
  email: yup.string().required('Email is required').email('Please enter a valid email address'),
});

type ChangeEmailFormData = yup.InferType<typeof changeEmailSchema>;

interface ChangeEmailFormProps {
  user: IUserData | null;
  hasEmail: boolean;
  isLoading: boolean;
  onSubmit: (data: ChangeEmailFormData) => Promise<void>;
  onCancel: () => void;
}

export function ChangeEmailForm({
  user,
  hasEmail,
  isLoading,
  onSubmit,
  onCancel,
}: ChangeEmailFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangeEmailFormData>({
    resolver: yupResolver(changeEmailSchema),
    defaultValues: {
      email: user?.email || '',
    },
  });

  const handleCancel = () => {
    reset({ email: user?.email || '' });
    onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30"
    >
      <h3 className="text-lg sm:text-xl font-bold text-light-text dark:text-dark-text">
        {hasEmail ? 'Change' : 'Add'} Email Address
      </h3>
      {!hasEmail && (
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 mt-1">
            Adding and email gives you more options like password reset, group invitations.
          </p>
          <div className="pb-4 ms-4">
            <h4 className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Benefits of adding email:
            </h4>
            <ul className="list-disc list-inside text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              <li>Password reset option.</li>
              <li>Receive group invitations.</li>
              <li>Enhanced account security.</li>
              <li>And more...</li>
            </ul>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {hasEmail && (
          <div className="p-3 bg-light-hover/20 dark:bg-dark-hover/30 rounded-lg mb-2">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Current Email
            </p>
            <p className="text-sm font-medium text-light-text dark:text-dark-text">{user?.email}</p>
          </div>
        )}

        <Input
          label="New Email"
          type="email"
          placeholder="Enter your email"
          {...register('email')}
          error={errors.email?.message}
          autoComplete="email"
          autoFocus
        />

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
            {!hasEmail ? 'Add' : 'Update'} Email
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
