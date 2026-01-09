import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Phone } from 'lucide-react';

import type { AddMemberToGroupResponse, IResponseInvitation } from '../groups.types';

import { Button } from '@shared/components/Button/Button';
import { Modal } from '@shared/components/Modal/Modal';
import { Input } from '@shared/components/Input/Input';

import { groupsApi } from '../groupsApi';
import { getErrorMessage } from '@/shared/utils';
import { CountryCodeSelector } from '@/shared/components/CountryCodeSelector/CountryCodeSelector';
import { Country } from '@/shared/types/auth.types';
import { countries } from '@/shared/components/CountryCodeSelector/countryCodeSelectorState';
import { cn } from '@/shared/utils';

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

const removePhoneFormat = (value: string): string => value.replace(/\D/g, '').trim();

type AddMemberFormData = {
  email?: string;
  phoneNumber?: string;
  role: 'dj' | 'member';
};

// Email schema
const emailSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .max(100, 'Email must be less than 100 characters')
    .required('Email is required')
    .trim(),
  role: yup
    .string()
    .oneOf(['dj', 'member'], 'Role must be either "dj" or "member"')
    .required('Role is required'),
});

// Phone schema
const phoneSchema = yup.object({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .test('phone-format', 'Please enter a valid phone number (e.g., 555-123-4567)', (value) => {
      if (!value) return false;
      const digits = removePhoneFormat(value);
      return digits.length === 10;
    }),
  role: yup
    .string()
    .oneOf(['dj', 'member'], 'Role must be either "dj" or "member"')
    .required('Role is required'),
});

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess?: (message: string) => void;
}

export function AddMemberModal({ isOpen, onClose, groupId, onSuccess }: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const [inviteType, setInviteType] = useState<'email' | 'phone'>('email');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
    watch,
    control,
    setValue,
  } = useForm<AddMemberFormData>({
    resolver:
      inviteType === 'email' ? yupResolver(emailSchema as any) : yupResolver(phoneSchema as any),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      role: 'member',
      email: '',
      phoneNumber: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (
      data: AddMemberFormData
    ): Promise<AddMemberToGroupResponse | IResponseInvitation> => {
      if (inviteType === 'email') {
        return groupsApi.addMemberToGroup({
          groupId,
          role: data.role,
          email: data.email,
        });
      } else {
        const phoneDigits = removePhoneFormat(data.phoneNumber || '');
        return groupsApi.addMemberToGroupByPhone({
          groupId,
          inviteePhone: selectedCountry.dialCode + phoneDigits,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      const message =
        inviteType === 'email' ? 'Member added successfully' : 'Invitation sent successfully';
      reset();
      setInviteType('email');
      setSelectedCountry(countries[0]);
      onClose();
      onSuccess?.(message);
    },
    onError: (error) => {
      console.error('Error al agregar miembro al grupo:', error);
    },
  });

  const onSubmit = (data: AddMemberFormData) => {
    clearErrors();
    mutation.mutate(data);
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      setInviteType('email');
      setSelectedCountry(countries[0]);
      onClose();
    }
  };

  const handleInviteTypeChange = (type: 'email' | 'phone') => {
    setInviteType(type);
    clearErrors();
    setValue('email', '');
    setValue('phoneNumber', '');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Member" size="md">
      <form key={inviteType} onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-lg">
            <UserPlus size={32} className="text-white" />
          </div>
        </div>

        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Invite a user to join this group
        </p>

        {/* Invite Type Selector */}
        <div className="flex gap-2 p-1 bg-light-hover dark:bg-dark-hover rounded-lg">
          <button
            type="button"
            onClick={() => handleInviteTypeChange('email')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all',
              'font-medium text-sm',
              inviteType === 'email'
                ? 'bg-white dark:bg-dark-card text-primary dark:text-primary-light shadow-sm'
                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            )}
          >
            <Mail size={16} />
            Email
          </button>
          <button
            type="button"
            onClick={() => handleInviteTypeChange('phone')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all',
              'font-medium text-sm',
              inviteType === 'phone'
                ? 'bg-white dark:bg-dark-card text-primary dark:text-primary-light shadow-sm'
                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            )}
          >
            <Phone size={16} />
            Phone
          </button>
        </div>

        <div className="space-y-4">
          {inviteType === 'email' ? (
            <Input
              {...register('email')}
              value={watch('email') || ''}
              label="Email Address"
              type="email"
              error={errors.email?.message}
              disabled={mutation.isPending}
              autoComplete="off"
              maxLength={100}
              countCharacters
              autoFocus
            />
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Phone Number
              </label>
              <div className="flex gap-3 items-start">
                <CountryCodeSelector value={selectedCountry.code} onChange={setSelectedCountry} />
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
                        disabled={mutation.isPending}
                        autoFocus
                      />
                    )}
                  />
                </div>
              </div>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Example: {selectedCountry.dialCode} 555-123-4567
              </p>
            </div>
          )}

          <div className="hidden">
            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <input
                  {...register('role')}
                  type="radio"
                  value="member"
                  disabled={mutation.isPending}
                  className="peer sr-only"
                />
                <div className="flex items-center justify-center p-4 rounded-lg border-2 border-light-hover dark:border-dark-hover bg-light-surface dark:bg-dark-surface cursor-pointer transition-all peer-checked:border-primary-600 peer-checked:bg-primary-600/10 peer-checked:text-primary-600 dark:peer-checked:text-primary-400 hover:border-primary-600/50">
                  <span className="text-sm font-medium">Member</span>
                </div>
              </label>
              <label className="relative">
                <input
                  {...register('role')}
                  type="radio"
                  value="dj"
                  disabled={mutation.isPending}
                  className="peer sr-only"
                />
                <div className="flex items-center justify-center p-4 rounded-lg border-2 border-light-hover dark:border-dark-hover bg-light-surface dark:bg-dark-surface cursor-pointer transition-all peer-checked:border-primary-600 peer-checked:bg-primary-600/10 peer-checked:text-primary-600 dark:peer-checked:text-primary-400 hover:border-primary-600/50">
                  <span className="text-sm font-medium">DJ</span>
                </div>
              </label>
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.role.message}</p>
            )}
          </div>
        </div>

        {mutation.error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(mutation.error)}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            className="flex-1"
          >
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
