import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { authService } from '@services/auth';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { withGuest } from '@shared/hoc/withGuest';
import { STORAGE_KEYS } from '@/shared/constants';
import { useAppDispatch } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';
import { validationIsObject } from '@/shared/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import logo from '@/app/assets/logo.png';

const schema = yup.object({
  email: yup
    .string()
    .email('Invalid email')
    .max(100, 'Email must be less than 100 characters')
    .required('Email is required')
    .trim(),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

type LoginFormData = yup.InferType<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(data);
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      dispatch(authActions.login(response));
      navigate('/');
    } catch (err: any) {
      if (validationIsObject(err.response?.data)) {
        setError(err.response?.data?.error || 'Error logging in');
      } else {
        setError('Error logging in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-light-bg dark:bg-dark-bg transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-8 shadow-xl border border-light-hover dark:border-dark-hover">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="T4SyncWave" className="w-24 h-24" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
              Welcome back
            </h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
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

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Login
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-extralight">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-primary hover:text-primary-dark font-bold transition-colors underline underline-offset-8 ps-1"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default withGuest(LoginPage);
