import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { paths } from '@/routes/paths';
import { withGuest } from '@/shared/hoc/withGuest';
import { Button } from '@shared/components/Button/Button';
import { authService } from '@/services/auth';
import { getErrorMessage } from '@/shared/utils';
import { STORAGE_KEYS } from '@/shared/constants';
import { useAppDispatch } from '@/app/hooks';
import { authActions } from '@/features/auth/authSlice';

const schema = yup.object({
  code: yup
    .string()
    .required('Verification code is required')
    .length(6, 'Code must be 6 digits')
    .matches(/^[0-9]+$/, 'Code must contain only numbers'),
});

type VerificationFormData = yup.InferType<typeof schema>;

const VerificationCodePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phoneNumber = searchParams.get('phone') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendingCode, setResendingCode] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!phoneNumber) {
      navigate(paths.PHONE_NUMBER);
    }
  }, [phoneNumber, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VerificationFormData>({
    resolver: yupResolver(schema),
  });

  const codeValue = watch('code') || '';

  useEffect(() => {
    if (codeValue.length === 6) {
      handleSubmit(onSubmit)();
    }
  }, [codeValue]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const currentCode = codeValue.split('');
    currentCode[index] = value.slice(-1);
    const newCode = currentCode.join('').slice(0, 6);
    setValue('code', newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pastedData.length === 6) {
      setValue('code', pastedData);
      inputRefs.current[5]?.focus();
    }
  };

  const onSubmit = async (data: VerificationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.verifyCode({
        phone: decodeURIComponent(phoneNumber),
        code: data.code,
      });
      if (response.status) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        dispatch(authActions.login(response));
        navigate('/');
      } else {
        const message = getErrorMessage(response.error, 'Invalid verification code');
        setError(message);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Invalid verification code');
      setError(message);
      setValue('code', '');
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResendingCode(true);
    try {
      const response = await authService.getCode({ phone: decodeURIComponent(phoneNumber) });
      if (response.status) {
        setResendCooldown(60);
        setError(null);
      } else {
        const message = getErrorMessage(response.error, 'Error resending code');
        setError(message);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Error resending code');
      setError(message);
    } finally {
      setResendingCode(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8 mt-16">
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
            Enter verification code
          </h1>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-light">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-light-text dark:text-dark-text">{phoneNumber}</span>
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('code')} />

            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={codeValue[index] || ''}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`
                    w-12 h-14 text-center text-xl font-semibold
                    rounded-lg border-2
                    bg-white dark:bg-dark-card
                    border-zinc-200 dark:border-zinc-800
                    text-light-text dark:text-dark-text
                    focus:outline-none focus:border-primary dark:focus:border-primary-light
                    transition-colors
                    ${errors.code ? 'border-red-500' : ''}
                  `}
                />
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 text-base font-medium"
              isLoading={isLoading}
              disabled={codeValue.length !== 6}
            >
              Verify Code
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Didn't receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="text-zinc-400">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-primary hover:text-primary-dark font-bold transition-colors underline underline-offset-2"
                  disabled={resendingCode}
                >
                  Resend code
                </button>
              )}
            </p>
          </div>
        </motion.div>

        <div className="mt-8 text-center">
          <Link
            to={paths.PHONE_NUMBER}
            className="text-xs sm:text-sm font-extralight text-light-text-secondary dark:text-dark-text-secondary hover:text-primary dark:hover:text-primary-light transition-colors underline underline-offset-2"
          >
            Change phone number
          </Link>
        </div>
      </div>
    </>
  );
};

export default withGuest(VerificationCodePage);
