import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { paths } from '@/routes/paths';

const ProfileStatus = () => {
  const user = useAppSelector((state) => state.auth.user);

  if (user?.email || !user?.email) return null;

  return (
    <div className="flex items-center gap-2 text-sm max-w-md w-full mx-auto my-4">
      <div className="w-full space-y-3 p-4 text-zinc-500 dark:text-zinc-400 font-medium bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Info className="text-red-500 dark:text-red-400" size={32} strokeWidth={3} />
          <div>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              Complete your profile to get the most <br /> out of T4SyncWave
            </span>
          </div>
        </div>
        <div>
          <span className="text-sm font-medium mb-2 block">
            Benefits of completing your profile:
          </span>
          <ul className="list-disc list-inside text-sm">
            <li>You can be invited to a DJ event using your email address.</li>
            <li>Personalized nickname that others will see.</li>
            <li>You can upload your preferred image as your avatar.</li>
            <li>And more...</li>
          </ul>
        </div>
        <div>
          <Link
            to={paths.PROFILE}
            className="ps-1 text-red-600 dark:text-red-400 underline underline-offset-4 font-semibold"
          >
            Complete Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfileStatus;
