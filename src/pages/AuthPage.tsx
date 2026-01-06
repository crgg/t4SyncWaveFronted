import { Mail, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/Button/Button';
import { paths } from '@/routes/paths';

const AuthPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="text-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary font-extralight mb-14">
          Sync your music experience
        </p>
      </div>

      <div className="space-y-2 mt-32">
        <Button variant="primary" className="w-full gap-2 py-3">
          <Phone size={16} /> <span className="text-xs sm:text-sm">Continue with Phone</span>
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 py-3"
          onClick={() => navigate(paths.LOGIN)}
        >
          <Mail size={16} /> <span className="text-xs sm:text-sm">Continue with Email</span>
        </Button>
      </div>
      <div className="text-center mt-8">
        <p className="text-xs sm:text-sm font-extralight">
          By continuing, you agree to our <br />
          <Link
            to={paths.TERMS}
            className="text-primary hover:text-primary-dark font-bold transition-colors underline underline-offset-8 ps-1"
          >
            Terms of Service
          </Link>{' '}
          and
          <Link
            to={paths.PRIVACY}
            className="text-primary hover:text-primary-dark font-bold transition-colors underline underline-offset-8 ps-1"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </>
  );
};

export default AuthPage;
