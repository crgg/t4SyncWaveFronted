/**
 * Componente de lista de reproducción estilo Spotify
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { removeTrack, setCurrentTrackIndex } from '@features/playlist/playlistSlice';
import { getWebSocketService } from '@services/websocket/websocketService';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { setTrack } from '@features/audio/audioSlice';
import { formatTime } from '@shared/utils';
import { WS_URL } from '@shared/constants';

export function Playlist() {
  const dispatch = useAppDispatch();
  const { tracks, currentTrackIndex } = useAppSelector((state) => state.playlist);
  const { trackId: currentTrackId } = useAppSelector((state) => state.audio);
  const { role, sessionId } = useAppSelector((state) => state.session);

  useEffect(() => {
    if (role !== 'host' || !sessionId || tracks.length === 0) return;

    try {
      const wsService = getWebSocketService({ url: WS_URL });
      if (wsService.isConnected()) {
        wsService.emit('playlist:update', {
          tracks: tracks.map(({ addedAt: _addedAt, ...track }) => track),
        });
      }
    } catch (error) {
      console.error('Error al sincronizar playlist:', error);
    }
  }, [tracks, role, sessionId]);

  const handleTrackSelect = (trackId: string, index: number) => {
    if (role !== 'host') return;

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    dispatch(setCurrentTrackIndex({ index }));

    dispatch(
      setTrack({
        trackId: track.id,
        trackUrl: track.url,
        trackTitle: track.title,
        trackArtist: track.artist,
      })
    );

    if (sessionId) {
      try {
        const wsService = getWebSocketService({ url: WS_URL });
        wsService.emit('audio:track-change', {
          trackId: track.id,
          trackUrl: track.url,
          trackTitle: track.title,
          trackArtist: track.artist,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error al notificar cambio de track:', error);
      }
    }
  };

  const handleRemoveTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (role === 'host') {
      dispatch(removeTrack({ trackId }));
      // La sincronización se hará automáticamente por el useEffect
    }
  };

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
          <p className="text-sm mt-2">Agrega canciones para comenzar</p>
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
                onClick={() => handleTrackSelect(track.id, index)}
                className={`
                  flex items-center gap-4 p-3 rounded-lg transition-colors
                  ${role === 'host' ? 'cursor-pointer hover:bg-dark-surface' : 'cursor-default'}
                  ${isCurrentTrack ? 'bg-dark-hover' : ''}
                  ${isPlaying ? 'ring-2 ring-primary-600' : ''}
                `}
              >
                {/* Número/Ícono de reproducción */}
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
                    <span className="text-sm text-dark-text-secondary">{index + 1}</span>
                  )}
                </div>

                {/* Información de la canción */}
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

                {/* Duración */}
                <div className="text-sm text-dark-text-secondary flex-shrink-0">
                  {track.duration ? formatTime(track.duration) : '--:--'}
                </div>

                {/* Botón eliminar (solo host) */}
                {role === 'host' && (
                  <button
                    onClick={(e) => handleRemoveTrack(track.id, e)}
                    className="p-1 rounded-full hover:bg-red-500/20 text-dark-text-secondary hover:text-red-400 transition-colors flex-shrink-0"
                    title="Eliminar de la lista"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
