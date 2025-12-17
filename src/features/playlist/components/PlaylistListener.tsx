/**
 * Componente de lista de reproducción para el Listener
 * Solo lectura, muestra la playlist sincronizada del host
 */

import { useAppSelector } from '@app/hooks';
import { formatTime } from '@shared/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function PlaylistListener() {
  const { tracks, currentTrackIndex } = useAppSelector((state) => state.playlist);
  const { trackId: currentTrackId } = useAppSelector((state) => state.audio);

  if (tracks.length === 0) {
    return (
      <div className="bg-dark-card rounded-xl shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-dark-text mb-4">Lista de Reproducción</h3>
        <div className="text-center py-8 text-dark-text-secondary">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          </svg>
          <p>No hay canciones en la lista</p>
          <p className="text-sm mt-2">Esperando a que el host agregue canciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text">Lista de Reproducción</h3>
        <span className="text-sm text-dark-text-secondary">{tracks.length} canciones</span>
      </div>

      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        <AnimatePresence>
          {tracks.map((track, index) => {
            const isCurrentTrack = track.id === currentTrackId;
            const isPlaying = isCurrentTrack && index === currentTrackIndex;

            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className={`
                  flex items-center gap-4 p-3 rounded-lg transition-colors cursor-default
                  ${isCurrentTrack ? 'bg-dark-hover' : ''}
                  ${isPlaying ? 'ring-2 ring-primary-600' : ''}
                `}
              >
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {isPlaying ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4"
                    >
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
                    <span className="text-sm text-dark-text-secondary">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium truncate ${
                      isCurrentTrack ? 'text-primary-600' : 'text-dark-text'
                    }`}
                  >
                    {track.title}
                  </div>
                  <div className="text-sm text-dark-text-secondary truncate">{track.artist}</div>
                </div>

                <div className="text-sm text-dark-text-secondary flex-shrink-0">
                  {track.duration ? formatTime(track.duration) : '--:--'}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

