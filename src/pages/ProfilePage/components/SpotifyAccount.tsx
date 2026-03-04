import { SpotifyAccountCard } from '@/features/spotify/components/SpotifyAccountCard';
import SpotifyIcon from '@/shared/icons/spotify-icon.svg';
import { cn } from '@/shared/utils';

const SpotifyAccount = ({ className }: { className?: string }) => {
  return (
    <div className={cn(className)}>
      <h3 className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-2">
        <img src={SpotifyIcon} alt="Spotify" className="w-5 h-5" /> <span>Spotify Account</span>
      </h3>
      <SpotifyAccountCard />
    </div>
  );
};

export default SpotifyAccount;
