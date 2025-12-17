/**
 * Componente para cargar música de ejemplo
 */

import { useAppDispatch, useAppSelector } from '@app/hooks';
import { setTrack } from '@features/audio/audioSlice';
import { addTrack, setCurrentTrack } from '@features/playlist/playlistSlice';
import { SAMPLE_TRACKS, DEFAULT_SAMPLE_TRACK } from '@shared/constants/sampleMusic';
import { Button } from '@shared/components/Button/Button';
import { getWebSocketService } from '@services/websocket/websocketService';
import { WS_URL } from '@shared/constants';
import { useState } from 'react';
import { store } from '@app/store';

export function LoadSampleMusic() {
  const dispatch = useAppDispatch();
  const { role, sessionId } = useAppSelector((state) => state.session);
  const [isLoading, setIsLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Solo mostrar si es host
  if (role !== 'host') {
    return null;
  }

  const handleLoadSample = (track: typeof DEFAULT_SAMPLE_TRACK) => {
    console.log('handleLoadSample', track);
    setIsLoading(true);

    // Agregar a la playlist
    dispatch(
      addTrack({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist,
      })
    );

    // Establecer como track actual
    dispatch(setCurrentTrack({ trackId: track.id }));

    // Actualizar estado de audio
    dispatch(
      setTrack({
        trackId: track.id,
        trackUrl: track.url,
        trackTitle: track.title,
        trackArtist: track.artist,
      })
    );

    // Notificar al servidor sobre el nuevo track y playlist
    if (sessionId) {
      try {
        const wsService = getWebSocketService({ url: WS_URL });
        // Obtener playlist actualizada después de agregar el track
        const updatedPlaylist = store.getState().playlist.tracks;
        wsService.emit('playlist:update', {
          tracks: updatedPlaylist.map(({ addedAt, ...track }) => track),
        });
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

    setIsLoading(false);
  };

  const handleLoadCustom = () => {
    if (!customUrl.trim()) {
      alert('Por favor ingresa una URL válida');
      return;
    }

    setIsLoading(true);
    const trackId = `custom-${Date.now()}`;

    // Agregar a la playlist
    dispatch(
      addTrack({
        id: trackId,
        url: customUrl.trim(),
        title: 'Audio Personalizado',
        artist: 'URL Externa',
      })
    );

    // Establecer como track actual
    dispatch(setCurrentTrack({ trackId }));

    // Actualizar estado de audio
    dispatch(
      setTrack({
        trackId,
        trackUrl: customUrl.trim(),
        trackTitle: 'Audio Personalizado',
        trackArtist: 'URL Externa',
      })
    );

    // Notificar al servidor
    if (sessionId) {
      try {
        const wsService = getWebSocketService({ url: WS_URL });
        // Obtener playlist actualizada después de agregar el track
        const updatedPlaylist = store.getState().playlist.tracks;
        wsService.emit('playlist:update', {
          tracks: updatedPlaylist.map(({ addedAt, ...track }) => track),
        });
        wsService.emit('audio:track-change', {
          trackId,
          trackUrl: customUrl.trim(),
          trackTitle: 'Audio Personalizado',
          trackArtist: 'URL Externa',
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error al notificar cambio de track:', error);
      }
    }

    setCustomUrl('');
    setIsLoading(false);
  };

  return (
    <div className="bg-dark-card rounded-xl shadow-2xl p-6 space-y-4 mb-6">
      <h3 className="text-lg font-semibold text-dark-text mb-4">Cargar Música</h3>

      {/* Música de ejemplo */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-dark-text-secondary">Música de Ejemplo:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SAMPLE_TRACKS.map((track) => (
            <Button
              key={track.id}
              variant="outline"
              onClick={() => handleLoadSample(track)}
              disabled={isLoading}
              className="justify-start text-left hover:bg-dark-hover"
            >
              <svg
                className="w-5 h-5 mr-2 text-primary-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <div className="font-medium text-dark-text">{track.title}</div>
                <div className="text-xs text-dark-text-secondary">{track.artist}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Cargar URL personalizada */}
      <div className="space-y-2 pt-4 border-t border-dark-hover">
        <h4 className="text-sm font-medium text-dark-text-secondary">
          O ingresa una URL personalizada:
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://ejemplo.com/audio.mp3"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 px-4 py-2 bg-dark-surface border border-dark-hover rounded-lg text-dark-text placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-600"
            disabled={isLoading}
          />
          <Button onClick={handleLoadCustom} disabled={isLoading || !customUrl.trim()}>
            Cargar
          </Button>
        </div>
        <p className="text-xs text-dark-text-secondary">
          Asegúrate de que la URL sea accesible públicamente y sea un archivo de audio válido
        </p>
      </div>
    </div>
  );
}
