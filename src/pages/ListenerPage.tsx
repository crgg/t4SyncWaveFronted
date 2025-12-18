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
    <div className="min-h-[calc(100vh-4rem)] bg-light-bg dark:bg-dark-bg p-4">
      <div className="max-w-4xl mx-auto">
        {/* Banner */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-xl">
          <div className="relative h-32 sm:h-40 bg-gradient-to-r from-primary-600 to-primary-400 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 text-center text-white px-4">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Modo Escucha</h1>
              <p className="text-sm opacity-90">
                ID: <code className="bg-white/20 px-2 py-1 rounded font-mono">{sessionId}</code>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Modo escucha activo
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

        <div className="mt-6 bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover rounded-xl p-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-2">Modo Escucha</h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Estás escuchando la reproducción del host. Solo puedes controlar tu volumen. La
            sincronización se realiza automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
