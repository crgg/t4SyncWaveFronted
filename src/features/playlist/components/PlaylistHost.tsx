import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Plus, Music2, Music } from 'lucide-react';
import { useState } from 'react';

import { removeTrack } from '@features/playlist/playlistSlice';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { useAudio } from '@/shared/hooks/useAudio';
import { formatTime } from '@shared/utils';
import { Button } from '@shared/components/Button/Button';
import { UploadTrackModal } from './UploadTrackModal';
import { AddTrackToGroupModal } from './AddTrackToGroupModal';

interface PlaylistHostProps {
  groupId: string;
}

export function PlaylistHost({ groupId }: PlaylistHostProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddTrackModalOpen, setIsAddTrackModalOpen] = useState(false);
  const [addTrackModalTab, setAddTrackModalTab] = useState<'library' | 'spotify'>('library');
  const { handleSelect } = useAudio();

  const dispatch = useAppDispatch();
  const { tracks, currentTrackIndex } = useAppSelector((state) => state.playlist);
  const { trackId: currentTrackId } = useAppSelector((state) => state.audio);

  const handleTrackSelect = (trackId: string) => {
    handleSelect(trackId);
  };

  const handleRemoveTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeTrack({ trackId }));
  };

  const onClickTrack = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (e.detail === 1) {
      handleTrackSelect(trackId);
    }
  };

  if (tracks.length === 0) {
    return (
      <>
        <div className="text-center py-6">
          <div className="">
            <svg
              className="w-20 h-20 mx-auto mb-4 opacity-50 text-light-text-secondary dark:text-dark-text-secondary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
            No tracks in playlist
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
            Upload your first track or add one from your library
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <Button
              onClick={() => {
                setAddTrackModalTab('library');
                setIsAddTrackModalOpen(true);
              }}
              variant="primary"
              className="flex items-center gap-2 text-xs"
            >
              <Music2 size={18} />
              Add from Library
            </Button>
            <Button
              onClick={() => {
                setAddTrackModalTab('spotify');
                setIsAddTrackModalOpen(true);
              }}
              variant="outline"
              className="flex items-center gap-2 text-xs border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10"
            >
              <Music size={18} />
              Add from Spotify
            </Button>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2 text-xs"
            >
              <Upload size={18} />
              Upload Track
            </Button>
          </div>
        </div>
        <UploadTrackModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          groupId={groupId}
        />
        {isAddTrackModalOpen && (
          <AddTrackToGroupModal
            isOpen={isAddTrackModalOpen}
            onClose={() => setIsAddTrackModalOpen(false)}
            groupId={groupId}
            initialTab={addTrackModalTab}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Button
          onClick={() => {
            setAddTrackModalTab('library');
            setIsAddTrackModalOpen(true);
          }}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Music2 size={16} />
          Add from Library
        </Button>
        <Button
          onClick={() => {
            setAddTrackModalTab('spotify');
            setIsAddTrackModalOpen(true);
          }}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10"
        >
          <Music size={16} />
          Add from Spotify
        </Button>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Upload Track
        </Button>
      </div>
      <div className="space-y-1 max-h-[600px] overflow-y-auto p-1">
        <AnimatePresence>
          {tracks.map((track, index) => {
            const isCurrentTrack = track.id === currentTrackId;
            const isPlaying = isCurrentTrack && index === currentTrackIndex;

            return (
              <motion.div
                key={track.id + track.url}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => onClickTrack(e, track.id)}
                className={`
                  flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer 
                  hover:bg-light-hover dark:hover:bg-dark-hover
                  ${isCurrentTrack ? 'bg-light-surface dark:bg-dark-surface' : ''}
                  ${isPlaying ? 'ring-2 ring-primary-600' : ''}
                `}
              >
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {isPlaying ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4">
                      <svg
                        className="w-full h-full text-primary-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </motion.div>
                  ) : (
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium text-sm truncate ${
                      isCurrentTrack
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-light-text dark:text-dark-text'
                    }`}
                  >
                    {track.title}
                  </div>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
                    {track.artist}
                  </div>
                  <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                    {track.url}
                  </div>
                </div>

                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0">
                  {track.duration ? formatTime(track.duration) : '--:--'}
                </div>

                <button
                  onClick={(e) => handleRemoveTrack(track.id, e)}
                  className="p-1 hidden rounded-full hover:bg-red-500/20 text-light-text-secondary dark:text-dark-text-secondary hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove from playlist"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <UploadTrackModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        groupId={groupId}
      />
      {isAddTrackModalOpen && (
        <AddTrackToGroupModal
          isOpen={isAddTrackModalOpen}
          onClose={() => setIsAddTrackModalOpen(false)}
          groupId={groupId}
          initialTab={addTrackModalTab}
        />
      )}
    </>
  );
}
