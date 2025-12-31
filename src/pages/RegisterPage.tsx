import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { authService } from '@services/auth';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { STORAGE_KEYS } from '@shared/constants';
import { withGuest } from '@shared/hoc/withGuest';
import { useAppDispatch } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import { validationIsObject } from '@/shared/utils';
import logo from '@/app/assets/logo.png';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Confirm your password'),
});

type RegisterFormData = yup.InferType<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.register({
        email: data.email,
        password: data.password,
        name: data.name,
      });
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      dispatch(authActions.login(response));
      navigate('/');
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error registering');
      } else {
        setError('Error registering');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#f2f2f6]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl p-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="T4SyncWave" className="w-24 h-24" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
              Create your account
            </h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Name"
              type="text"
              placeholder="John Doe"
              {...register('name')}
              error={errors.name?.message}
              maxLength={150}
            />

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              {...register('email')}
              error={errors.email?.message}
              maxLength={100}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              maxLength={50}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              maxLength={50}
            />

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Register
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary-dark font-bold">
                Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default withGuest(RegisterPage);
