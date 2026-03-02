import { useQuery } from '@tanstack/react-query';
import { Music, ExternalLink, Loader2, Crown, User } from 'lucide-react';
import { getSpotifyCurrentUser } from '../spotifyApi';
import { initiateSpotifyLogin, isSpotifyConnected } from '../spotifyAuth';
import { SPOTIFY_CONFIG } from '../constants';
import { cn } from '@shared/utils';

const PRODUCT_LABELS: Record<string, { label: string; color: string }> = {
  premium: { label: 'Premium', color: 'bg-[#1DB954] text-white' },
  free: { label: 'Free', color: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400' },
  open: { label: 'Free', color: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400' },
};

export function SpotifyAccountCard() {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['spotify-profile'],
    queryFn: getSpotifyCurrentUser,
    enabled: isSpotifyConnected() && !!SPOTIFY_CONFIG.CLIENT_ID,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (!SPOTIFY_CONFIG.CLIENT_ID) return null;

  if (!isSpotifyConnected()) {
    return (
      <div className="rounded-xl border border-light-hover dark:border-dark-hover overflow-hidden">
        <div className="bg-gradient-to-br from-[#1DB954]/10 to-[#1ed760]/5 dark:from-[#1DB954]/20 dark:to-[#1ed760]/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1DB954]/20 dark:bg-[#1DB954]/30 flex items-center justify-center flex-shrink-0">
              <Music size={24} className="text-[#1DB954]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                Spotify not connected
              </p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                Connect to search and add tracks from Spotify
              </p>
            </div>
            <button
              onClick={() => initiateSpotifyLogin()}
              className="flex-shrink-0 px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-white text-sm font-medium transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-light-hover dark:border-dark-hover p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-light-hover dark:bg-dark-hover animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-light-hover dark:bg-dark-hover rounded animate-pulse" />
            <div className="h-3 w-24 bg-light-hover dark:bg-dark-hover rounded animate-pulse" />
          </div>
          <Loader2
            size={20}
            className="animate-spin text-light-text-secondary dark:text-dark-text-secondary"
          />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Music size={24} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Spotify session expired
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              Reconnect to use Spotify features
            </p>
          </div>
        </div>
      </div>
    );
  }

  const productInfo = profile.product
    ? (PRODUCT_LABELS[profile.product] ?? {
        label: profile.product,
        color: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400',
      })
    : null;

  return (
    <div className="rounded-xl border border-light-hover dark:border-dark-hover overflow-hidden">
      <div className="bg-gradient-to-br from-[#1DB954]/10 to-[#1ed760]/5 dark:from-[#1DB954]/20 dark:to-[#1ed760]/10 p-4">
        <div className="flex items-center gap-3">
          {profile.images?.[0]?.url ? (
            <img
              src={profile.images[0].url}
              alt=""
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-white/50 dark:ring-zinc-800/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#1DB954]/30 flex items-center justify-center flex-shrink-0">
              <User size={24} className="text-[#1DB954]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-light-text dark:text-dark-text truncate">
                {profile.display_name || 'Spotify User'}
              </p>
              {productInfo && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    productInfo.color
                  )}
                >
                  {profile.product === 'premium' && <Crown size={10} />}
                  {productInfo.label}
                </span>
              )}
            </div>
            {profile.email && (
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate mt-0.5">
                {profile.email}
              </p>
            )}
            {profile.country && !profile.email && (
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                {profile.country}
              </p>
            )}
          </div>
          {profile.external_urls?.spotify && (
            <a
              href={profile.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 rounded-lg hover:bg-[#1DB954]/20 dark:hover:bg-[#1DB954]/30 transition-colors"
              title="Open Spotify profile"
            >
              <ExternalLink size={18} className="text-[#1DB954]" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
