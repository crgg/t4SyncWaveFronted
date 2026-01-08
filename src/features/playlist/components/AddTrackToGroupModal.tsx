import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

import { libraryApi, type Audio } from '@/features/library/libraryApi';
import { useLocalAudioPlayer } from '@/shared/hooks/useLocalAudioPlayer';
import { Modal } from '@shared/components/Modal/Modal';
import { Button } from '@shared/components/Button/Button';
import { LocalAudioPlayer } from '@/pages/LibraryPage/components/LocalAudioPlayer';
import { SearchAndSortControls } from '@/pages/LibraryPage/components/SearchAndSortControls';
import { uploadService } from '@services/upload';
import { formatTime, msToSeconds, cn, getErrorMessage } from '@shared/utils';
import { addTrack } from '@features/playlist/playlistSlice';
import { useAppDispatch } from '@app/hooks';

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc';

interface AddTrackToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddTrackToGroupModal({ isOpen, onClose, groupId }: AddTrackToGroupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const {
    data: libraryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getLibrary(),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 2,
    enabled: isOpen,
  });

  const allTracks = libraryData?.status && libraryData?.audio ? libraryData.audio : [];

  const {
    audioState,
    play,
    pause,
    seek,
    setVolume,
    setTrack,
    nextTrack,
    previousTrack,
    skipForward,
    skipBackward,
  } = useLocalAudioPlayer(allTracks);

  const currentTrackIndex = useMemo(() => {
    if (!audioState.trackId) return null;
    return allTracks.findIndex((t) => t.id === audioState.trackId);
  }, [audioState.trackId, allTracks]);

  const displayedTracks = useMemo(() => {
    let filtered = allTracks;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = allTracks.filter(
        (track) =>
          track.title?.toLowerCase().includes(query) || track.artist?.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'artist-asc':
          return (a.artist || '').localeCompare(b.artist || '');
        case 'artist-desc':
          return (b.artist || '').localeCompare(a.artist || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [allTracks, searchQuery, sortBy]);

  const handleTrackClick = (track: Audio) => {
    setTrack(
      {
        id: track.id,
        url: track.file_url,
        title: track.title,
        artist: track.artist,
        duration_ms: track.duration_ms,
      },
      true
    );
  };

  const handleTrackSelect = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrackId(trackId === selectedTrackId ? null : trackId);
  };

  const handleAddTrack = async () => {
    if (!selectedTrackId || !groupId) return;

    setIsAdding(true);
    try {
      const response = await uploadService.addTrackToGroup(selectedTrackId, groupId);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });

      dispatch(
        addTrack({
          id: response.track.id,
          title: response.track.title,
          artist: response.track.artist,
          url: response.track.file_url,
          duration: msToSeconds(response.track.duration_ms),
        })
      );

      toast.success('Track added to group successfully!');

      setSelectedTrackId(null);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || 'Error adding track to group';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    if (!isAdding) {
      setSelectedTrackId(null);
      setSearchQuery('');
      setSortBy('newest');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Select a track" size="xl">
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 dark:bg-red-900/30 border border-red-500/20 dark:border-red-700/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Error loading library
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                  {getErrorMessage(error, 'Failed to load tracks')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Audio Player */}
            {audioState.trackId && (
              <LocalAudioPlayer
                isPlaying={audioState.isPlaying}
                currentPosition={audioState.currentPosition}
                trackDuration={audioState.trackDuration}
                trackTitle={audioState.trackTitle}
                trackArtist={audioState.trackArtist}
                volume={audioState.volume}
                onPlay={play}
                onPause={pause}
                onSeek={seek}
                onVolumeChange={setVolume}
                onSkipForward={skipForward}
                onSkipBackward={skipBackward}
                onNextTrack={nextTrack}
                onPreviousTrack={previousTrack}
                hasNextTrack={
                  currentTrackIndex !== null && currentTrackIndex < allTracks.length - 1
                }
                hasPreviousTrack={currentTrackIndex !== null && currentTrackIndex > 0}
              />
            )}

            {/* Search and Sort Controls */}
            <SearchAndSortControls
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSearchChange={setSearchQuery}
              onSortChange={setSortBy}
              resultsCount={displayedTracks.length}
            />

            {/* Track List */}
            {displayedTracks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Music
                    size={48}
                    className="mx-auto text-light-text-secondary dark:text-dark-text-secondary opacity-50"
                  />
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {searchQuery
                      ? 'No tracks found matching your search'
                      : 'No tracks in your library'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 ">
                <div className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-3 px-1">
                  Select a track
                </div>
                <div className="max-h-[220px] sm:max-h-[400px] overflow-y-auto p-0.5">
                  <AnimatePresence>
                    {displayedTracks.map((track) => {
                      const isCurrentTrack = track.id === audioState.trackId;
                      const isSelected = track.id === selectedTrackId;
                      const displayText =
                        track.artist && track.title
                          ? track.title
                          : track.title || track.artist || 'Unknown Track';

                      return (
                        <motion.div
                          key={track.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleTrackClick(track)}
                          className={cn(
                            'flex items-center gap-2 sm:gap-4 p-3 rounded-lg transition-all cursor-pointer relative group',
                            isCurrentTrack
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : 'hover:bg-light-hover dark:hover:bg-dark-hover',
                            isSelected && 'ring-2 ring-primary-600 dark:ring-primary-400'
                          )}
                        >
                          {/* Selection Checkbox */}
                          <button
                            onClick={(e) => handleTrackSelect(track.id, e)}
                            className={cn(
                              'flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
                              isSelected
                                ? 'bg-primary-600 dark:bg-primary-400 border-primary-600 dark:border-primary-400'
                                : 'border-light-text-secondary dark:border-dark-text-secondary hover:border-primary-600 dark:hover:border-primary-400'
                            )}
                          >
                            {isSelected && <CheckCircle2 size={14} className="text-white" />}
                          </button>

                          {/* Track Icon */}
                          <Music
                            size={18}
                            className={cn(
                              'flex-shrink-0',
                              isCurrentTrack
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-light-text-secondary dark:text-dark-text-secondary'
                            )}
                          />

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                'text-sm font-medium truncate',
                                isCurrentTrack
                                  ? 'text-primary-600 dark:text-primary-400'
                                  : 'text-light-text dark:text-dark-text'
                              )}
                            >
                              {displayText}
                            </div>
                            {/* {track.artist && (
                            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                              {track.artist}
                            </div>
                          )} */}
                          </div>

                          {/* Duration */}
                          {track.duration_ms && (
                            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0">
                              {formatTime(msToSeconds(track.duration_ms))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t border-light-hover dark:border-dark-hover">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isAdding}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleAddTrack}
            isLoading={isAdding}
            disabled={isAdding || !selectedTrackId || isLoading || !!error}
            className="flex-1"
          >
            Add Track
          </Button>
        </div>
      </div>
    </Modal>
  );
}
