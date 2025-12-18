import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/hooks';
import { AudioPlayerListener } from '@features/audio/components/AudioPlayerListener';
import { PlaylistListener } from '@features/playlist/components/PlaylistListener';
import { ConnectionStatus } from '@shared/components/ConnectionStatus/ConnectionStatus';
import { Button } from '@shared/components/Button/Button';
import { useWebSocket } from '@shared/hooks/useWebSocket';
import { getAudioService } from '@services/audio/audioService';

export function ListenerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { leaveSession } = useWebSocket();
  const { sessionId: currentSessionId, role } = useAppSelector((state) => state.session);

  useEffect(() => {
    if (currentSessionId !== sessionId || role !== 'listener') {
      navigate('/');
    }
  }, [sessionId, currentSessionId, role, navigate]);

  const handleLeave = () => {
    try {
      const audioService = getAudioService();
      const audioState = audioService.getState();

      if (audioState && audioState.trackUrl) {
        try {
          audioService.pause();
        } catch (error) {
          console.warn('Error al pausar audio al salir:', error);
        }
      }

      try {
        audioService.cleanup();
      } catch (error) {
        console.warn('Error al limpiar audio al salir:', error);
      }
    } catch (error) {
      console.warn('Error al obtener servicio de audio al salir:', error);
    }

    leaveSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-bg p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-dark-card rounded-xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-dark-text">Modo Escucha</h1>
              <p className="text-sm text-dark-text-secondary mt-1">
                Sesión:{' '}
                <code className="bg-dark-hover px-2 py-1 rounded text-primary-600 font-mono">
                  {sessionId}
                </code>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <Button variant="outline" onClick={handleLeave}>
                Salir
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <PlaylistListener />
        </div>

        <AudioPlayerListener />

        <div className="mt-6 bg-dark-surface border border-dark-hover rounded-xl p-4">
          <h3 className="font-semibold text-dark-text mb-2">Modo Escucha</h3>
          <p className="text-sm text-dark-text-secondary">
            Estás escuchando la reproducción del host. Solo puedes controlar tu volumen. La
            sincronización se realiza automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
