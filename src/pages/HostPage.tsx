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
import { withAuth } from '@shared/hoc/withAuth';

function HostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { leaveSession } = useWebSocket();
  const {
    sessionId: currentSessionId,
    role,
    participantCount,
  } = useAppSelector((state) => state.session);

  useEffect(() => {
    if (currentSessionId !== sessionId || role !== 'dj') {
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
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sesión Host</h1>
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
                <span className="font-medium text-light-text dark:text-dark-text">
                  {participantCount}
                </span>{' '}
                participantes escuchando
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <Button variant="outline" onClick={handleLeave}>
                Leave
              </Button>
            </div>
          </div>
        </div>

        <LoadSampleMusic />

        <div className="mb-6">
          <PlaylistHost />
        </div>

        <AudioPlayerHost />

        <div className="mt-6 bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover rounded-xl p-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-2">
            Instructions for the Host:
          </h3>
          <ul className="list-disc list-inside text-sm text-light-text-secondary dark:text-dark-text-secondary space-y-1">
            <li>Share the session ID with other users to join</li>
            <li>Only you can control the playback (play, pause, forward, backward)</li>
            <li>Each user can control their own volume</li>
            <li>The changes are automatically synchronized with all listeners</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default withAuth(HostPage);
