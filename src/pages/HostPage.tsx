/**
 * Página del Host - Control total de la reproducción
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/hooks';
import { AudioPlayerHost } from '@features/audio/components/AudioPlayerHost';
import { LoadSampleMusic } from '@features/audio/components/LoadSampleMusic';
import { PlaylistHost } from '@features/playlist/components/PlaylistHost';
import { ConnectionStatus } from '@shared/components/ConnectionStatus/ConnectionStatus';
import { Button } from '@shared/components/Button/Button';
import { useWebSocket } from '@shared/hooks/useWebSocket';
import { getAudioService } from '@services/audio/audioService';

export function HostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { leaveSession } = useWebSocket();
  const {
    sessionId: currentSessionId,
    role,
    participantCount,
  } = useAppSelector((state) => state.session);

  // Verificar que el usuario es el host
  useEffect(() => {
    if (currentSessionId !== sessionId || role !== 'host') {
      navigate('/');
    }
  }, [sessionId, currentSessionId, role, navigate]);

  const handleLeave = () => {
    // Detener audio antes de salir (solo si está inicializado)
    try {
      const audioService = getAudioService();
      const audioState = audioService.getState();

      // Solo intentar pausar y limpiar si el audio está inicializado
      if (audioState && audioState.trackUrl) {
        try {
          audioService.pause();
        } catch (error) {
          console.warn('Error al pausar audio al salir:', error);
        }
      }

      // Siempre limpiar, cleanup() maneja el caso cuando no está inicializado
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
        {/* Header */}
        <div className="bg-dark-card rounded-xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-dark-text">Sesión Host</h1>
              <p className="text-sm text-dark-text-secondary mt-1">
                ID de sesión:{' '}
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
          <div className="mt-4 text-sm text-dark-text-secondary">
            <span className="font-medium text-dark-text">{participantCount}</span> participantes
            escuchando
          </div>
        </div>

        {/* Cargar Música */}
        <LoadSampleMusic />

        {/* Lista de Reproducción */}
        <div className="mb-6">
          <PlaylistHost />
        </div>

        {/* Audio Player */}
        <AudioPlayerHost />

        {/* Instrucciones */}
        <div className="mt-6 bg-dark-surface border border-dark-hover rounded-xl p-4">
          <h3 className="font-semibold text-dark-text mb-2">Instrucciones para el Host:</h3>
          <ul className="list-disc list-inside text-sm text-dark-text-secondary space-y-1">
            <li>Comparte el ID de sesión con otros usuarios para que se unan</li>
            <li>Solo tú puedes controlar la reproducción (play, pause, adelantar, retroceder)</li>
            <li>Cada usuario puede controlar su propio volumen</li>
            <li>Los cambios se sincronizan automáticamente con todos los listeners</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
