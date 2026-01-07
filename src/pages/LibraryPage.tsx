import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

import { libraryApi, type Audio } from '@/features/library/libraryApi';
import { withAuth } from '@/shared/hoc/withAuth';
import { useLocalAudioPlayer } from '@/shared/hooks/useLocalAudioPlayer';

import { LibraryPageHeader } from './LibraryPage/components/LibraryPageHeader';
import { LibraryPageSkeleton } from './LibraryPage/components/LibraryPageSkeleton';
import { ErrorState } from '@/pages/GroupsPage/components/ErrorState';
import { EmptyLibraryState } from './LibraryPage/components/EmptyLibraryState';
import { TrackList } from './LibraryPage/components/TrackList';
import { LocalAudioPlayer } from './LibraryPage/components/LocalAudioPlayer';
import { SearchAndSortControls } from './LibraryPage/components/SearchAndSortControls';
import { UploadTrackModal } from './LibraryPage/components/UploadTrackModal';

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc';

const LibraryPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const {
    data: libraryData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getLibrary(),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 2,
  });

  const allTracks = libraryData?.status && libraryData?.audio ? libraryData.audio : [];

  // Initialize audio player with tracks
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

  // Find current track index
  const currentTrackIndex = useMemo(() => {
    if (!audioState.trackId) return null;
    return allTracks.findIndex((t) => t.id === audioState.trackId);
  }, [audioState.trackId, allTracks]);

  // Filter and sort tracks
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

  const handleAddTrack = () => {
    setIsUploadModalOpen(true);
  };

  if (isLoading) {
    return <LibraryPageSkeleton />;
  }

  if (error) {
    return (
      <>
        <div className="w-full max-w-4xl mx-auto pb-24">
          <LibraryPageHeader tracksCount={0} onAddTrack={handleAddTrack} />
        </div>
        <ErrorState error={error} onRetry={() => refetch()} />
      </>
    );
  }

  if (allTracks.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        <LibraryPageHeader tracksCount={0} onAddTrack={handleAddTrack} />
        <EmptyLibraryState onAddTrack={handleAddTrack} />
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-4xl mx-auto pb-24 space-y-5">
        <LibraryPageHeader tracksCount={displayedTracks.length} onAddTrack={handleAddTrack} />

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
            hasNextTrack={currentTrackIndex !== null && currentTrackIndex < allTracks.length - 1}
            hasPreviousTrack={currentTrackIndex !== null && currentTrackIndex > 0}
          />
        )}

        <SearchAndSortControls
          searchQuery={searchQuery}
          sortBy={sortBy}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          resultsCount={displayedTracks.length}
        />

        {displayedTracks.length === 0 && searchQuery ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="text-6xl">
                <Search
                  size={64}
                  className="mx-auto text-light-text-secondary dark:text-dark-text-secondary"
                />
              </div>
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
                No tracks found
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
                {searchQuery
                  ? `No tracks match your search "${searchQuery}". Try adjusting your search terms.`
                  : 'Try adjusting your filters to see more tracks.'}
              </p>
            </motion.div>
          </div>
        ) : (
          <TrackList
            tracks={displayedTracks}
            currentTrackId={audioState.trackId || null}
            onTrackClick={handleTrackClick}
          />
        )}
      </div>
      <UploadTrackModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </>
  );
};

export default withAuth(LibraryPage);
