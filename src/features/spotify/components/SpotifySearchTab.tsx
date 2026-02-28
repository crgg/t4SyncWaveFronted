import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, CheckCircle2, Loader2, Search } from 'lucide-react';
import { searchSpotifyTracks } from '../spotifyApi';
import { initiateSpotifyLogin, isSpotifyConnected } from '../spotifyAuth';
import { SPOTIFY_CONFIG } from '../constants';
import { formatTime, msToSeconds, cn } from '@shared/utils';

interface SpotifySearchTabProps {
  selectedTrackId: string | null;
  onTrackSelect: (trackId: string | null) => void;
  onAddTrack: (track: {
    id: string;
    title: string;
    artist: string;
    duration: number;
    source: 'spotify';
    spotifyId: string;
  }) => void;
  isAdding: boolean;
  groupId: string;
}

export function SpotifySearchTab({
  selectedTrackId,
  onTrackSelect,
  onAddTrack,
  isAdding,
  groupId,
}: SpotifySearchTabProps) {
  void groupId; // Reserved for future backend API when adding Spotify track to group
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const {
    data: spotifyTracks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['spotify-search', debouncedQuery],
    queryFn: () => searchSpotifyTracks(debouncedQuery, 10),
    enabled: isSpotifyConnected() && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60,
  });

  const handleConnect = useCallback(() => {
    if (!SPOTIFY_CONFIG.CLIENT_ID) {
      return;
    }
    initiateSpotifyLogin();
  }, []);

  const handleAddSpotifyTrack = useCallback(() => {
    if (!selectedTrackId || !spotifyTracks) return;
    const track = spotifyTracks.find((t) => t.id === selectedTrackId);
    if (!track) return;
    onAddTrack({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      duration: msToSeconds(track.duration_ms),
      source: 'spotify',
      spotifyId: track.id,
    });
  }, [selectedTrackId, spotifyTracks, onAddTrack]);

  const tracks = spotifyTracks ?? [];

  if (!SPOTIFY_CONFIG.CLIENT_ID) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Spotify integration is not configured. Add VITE_SPOTIFY_CLIENT_ID to your .env file.
        </p>
      </div>
    );
  }

  if (!isSpotifyConnected()) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Connect your Spotify account to search and add tracks. Spotify Premium required for
          playback.
        </p>
        <p className="text-xs text-light-text-secondary/80 dark:text-dark-text-secondary/80">
          Note: Spotify tracks play on each user&apos;s device individually (no sync per Spotify
          terms).
        </p>
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium transition-colors"
        >
          <Music size={18} />
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Spotify (min 2 characters)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-light-hover dark:border-dark-hover bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Results */}
      {searchQuery.trim().length < 2 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Type at least 2 characters to search
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">
            {error instanceof Error ? error.message : 'Search failed'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : tracks.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            No tracks found
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-3 px-1">
            Select a track
          </div>
          <div className="max-h-[280px] overflow-y-auto p-0.5">
            <AnimatePresence>
              {tracks.map((track) => {
                const isSelected = track.id === selectedTrackId;
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onTrackSelect(isSelected ? null : track.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer',
                      'hover:bg-light-hover dark:hover:bg-dark-hover',
                      isSelected &&
                        'ring-2 ring-primary-600 dark:ring-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrackSelect(track.id === selectedTrackId ? null : track.id);
                      }}
                      className={cn(
                        'flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
                        isSelected
                          ? 'bg-primary-600 dark:bg-primary-400 border-primary-600 dark:border-primary-400'
                          : 'border-light-text-secondary dark:border-dark-text-secondary'
                      )}
                    >
                      {isSelected && <CheckCircle2 size={14} className="text-white" />}
                    </button>
                    {track.album?.images?.[0]?.url ? (
                      <img
                        src={track.album.images[0].url}
                        alt=""
                        className="w-10 h-10 rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-light-hover dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
                        <Music
                          size={18}
                          className="text-light-text-secondary dark:text-dark-text-secondary"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-light-text dark:text-dark-text">
                        {track.name}
                      </div>
                      <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                        {track.artists.map((a) => a.name).join(', ')}
                      </div>
                    </div>
                    <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0">
                      {formatTime(msToSeconds(track.duration_ms))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add button for Spotify */}
      {selectedTrackId && (
        <div className="pt-2 flex gap-2">
          <button
            onClick={handleAddSpotifyTrack}
            disabled={isAdding}
            className="flex-1 py-2.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Music size={18} />
                Add to playlist
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
