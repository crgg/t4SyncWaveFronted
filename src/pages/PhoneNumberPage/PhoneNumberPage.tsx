import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Country } from '@/shared/types/auth.types';
import { countries } from '@/shared/components/CountryCodeSelector/countryCodeSelectorState';

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 10);
  if (limitedDigits.length <= 3) {
    return limitedDigits;
  } else if (limitedDigits.length <= 6) {
    return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
  } else {
    return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
};

const removePhoneFormat = (value: string): string => {
  return value.replace(/\D/g, '');
};

const schema = yup.object({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .test('phone-format', 'Please enter a valid phone number (e.g., 555-123-4567)', (value) => {
      if (!value) return false;
      const digits = removePhoneFormat(value);
      return digits.length === 10;
    }),
});

type PhoneFormData = yup.InferType<typeof schema>;

const PhoneNumberPage = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);

  const handleCountryCodeChange = (selectedCountry: Country) => {
    setSelectedCountry(selectedCountry);
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const phoneDigits = removePhoneFormat(data.phoneNumber);
      const phone = selectedCountry.dialCode + phoneDigits;
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
        <div className="text-center mb-8">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-light">
            We'll send you a verification code
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex gap-3 items-start">
              <CountryCodeSelector
                value={selectedCountry.code}
                onChange={handleCountryCodeChange}
              />
              <div className="flex-1">
                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="tel"
                      placeholder="555-123-4567"
                      value={field.value || ''}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        field.onChange(formatted);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      maxLength={12}
                      error={errors.phoneNumber?.message}
                      className="w-full rounded-xl"
                    />
                  )}
                />
              </div>
            </div>

            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Example: {selectedCountry.dialCode} 555-123-4567
            </p>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

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

        <div className="mt-8 text-center">
          <p className="text-xs sm:text-sm font-extralight text-zinc-500 dark:text-zinc-400">
            Do you have an email?{' '}
            <Link
              to={paths.AUTH}
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
