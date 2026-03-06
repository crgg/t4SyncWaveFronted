import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Music, ExternalLink, Loader2, Crown, User, LogOut, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSpotifyCurrentUser } from '../spotifyApi';
import { initiateSpotifyLogin, isSpotifyConnected, logoutSpotify } from '../spotifyAuth';
import { disconnectSpotifyPlayer } from '../spotifyPlayerService';
import { SPOTIFY_CONFIG } from '../constants';
import { cn } from '@shared/utils';

const SPOTIFY_DISCONNECT_EVENT = 'spotify-disconnected';

export function dispatchSpotifyDisconnected(): void {
  window.dispatchEvent(new CustomEvent(SPOTIFY_DISCONNECT_EVENT));
}

const PRODUCT_LABELS: Record<string, { label: string; color: string }> = {
  premium: { label: 'Premium', color: 'bg-[#1DB954] text-white' },
  free: { label: 'Free', color: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400' },
  open: { label: 'Free', color: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400' },
};

export function SpotifyAccountCard() {
  const queryClient = useQueryClient();
  const [, setRefresh] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const handler = () => {
      queryClient.removeQueries({ queryKey: ['spotify-profile'] });
      setRefresh((n) => n + 1);
    };
    window.addEventListener(SPOTIFY_DISCONNECT_EVENT, handler);
    return () => window.removeEventListener(SPOTIFY_DISCONNECT_EVENT, handler);
  }, [queryClient]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      disconnectSpotifyPlayer();
      logoutSpotify();
      queryClient.removeQueries({ queryKey: ['spotify-profile'] });
      dispatchSpotifyDisconnected();
    } finally {
      setIsDisconnecting(false);
      setShowConfirm(false);
    }
  };

  const connected = isSpotifyConnected();
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['spotify-profile'],
    queryFn: getSpotifyCurrentUser,
    enabled: connected && !!SPOTIFY_CONFIG.CLIENT_ID,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (!SPOTIFY_CONFIG.CLIENT_ID) return null;

  if (!connected) {
    return (
      <div className="rounded-xl border border-gray-500 dark:border-gray-900 overflow-hidden">
        <div className="p-4 bg-white dark:bg-dark-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-500/20 dark:bg-gray-500/30 flex items-center justify-center flex-shrink-0">
              <Music size={24} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-light-text dark:text-dark-text">
                Spotify not connected
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
      <div className="rounded-xl border border-emerald-500 dark:border-emerald-900 p-4">
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
    <div className="rounded-xl border border-emerald-500 dark:border-emerald-900 overflow-hidden">
      {/* ── Profile row ── */}
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
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                {profile.email}
              </p>
            )}
            {profile.country && !profile.email && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {profile.country}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {profile.external_urls?.spotify && (
              <a
                href={profile.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-[#1DB954]/20 dark:hover:bg-[#1DB954]/30 transition-colors"
                title="Open Spotify profile"
              >
                <ExternalLink size={17} className="text-[#1DB954]" />
              </a>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={showConfirm}
              className="p-2 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
              title="Disconnect Spotify account"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Inline disconnect confirmation ── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            key="confirm"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={17}
                  className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Disconnect Spotify account?
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5 leading-relaxed">
                    This will close the Spotify session and stop playback on this device.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isDisconnecting}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
                >
                  {isDisconnecting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <LogOut size={13} />
                  )}
                  {isDisconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
