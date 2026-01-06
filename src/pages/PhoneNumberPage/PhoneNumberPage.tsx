import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { paths } from '@/routes/paths';
import { withGuest } from '@/shared/hoc/withGuest';
import { Input } from '@shared/components/Input/Input';
import { Button } from '@shared/components/Button/Button';
import { CountryCodeSelector } from '@shared/components/CountryCodeSelector/CountryCodeSelector';
import { authService } from '@/services/auth';
import { getErrorMessage } from '@/shared/utils';

const schema = yup.object({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^[0-9\s\-()]+$/, 'Please enter a valid phone number')
    .min(7, 'Phone number must be at least 7 digits'),
});

type PhoneFormData = yup.InferType<typeof schema>;

const PhoneNumberPage = () => {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState('+1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const phone = countryCode + data.phoneNumber.trim();
      const response = await authService.getCode({ phone });
      if (response.status) {
        navigate(`${paths.VERIFY_CODE}?phone=${encodeURIComponent(phone)}`);
      } else {
        setError(response.error || 'Error sending verification code');
      }
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        {/* Título y subtítulo */}
        <div className="text-center mb-8">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-light">
            We'll send you a verification code
          </p>
        </div>

        {/* Formulario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Campos de código de país y número */}
            <div className="flex gap-3 items-start">
              <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
              <div className="flex-1">
                <Input
                  type="tel"
                  placeholder="Phone number"
                  {...register('phoneNumber')}
                  error={errors.phoneNumber?.message}
                  className="w-full rounded-xl"
                />
              </div>
            </div>

            {/* Texto de ejemplo */}
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Example: {countryCode} 555-123-4567
            </p>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Botón de envío */}
            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 text-base font-medium"
              isLoading={isLoading}
            >
              Send Code
            </Button>
          </form>
        </motion.div>

        {/* Link para cambiar método */}
        <div className="mt-8 text-center">
          <p className="text-xs sm:text-sm font-extralight text-light-text-secondary dark:text-dark-text-secondary">
            Do you have an email?{' '}
            <Link
              to={paths.LOGIN}
              className="text-primary hover:text-primary-dark font-bold transition-colors underline underline-offset-2"
            >
              Change method
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default withGuest(PhoneNumberPage);
