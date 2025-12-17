/**
 * Formulario para crear una nueva sesión (Host)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { createSessionStart } from '@features/session/sessionSlice';
import { useWebSocket } from '@shared/hooks/useWebSocket';
import { Button } from '@shared/components/Button/Button';
import { Input } from '@shared/components/Input/Input';

export function CreateSessionForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { createSession } = useWebSocket();
  const { isCreating, error, sessionId } = useAppSelector((state) => state.session);
  const [sessionName, setSessionName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(createSessionStart({ name: sessionName || undefined }));
    createSession(sessionName || undefined);
  };

  useEffect(() => {
    if (sessionId) {
      navigate(`/host/${sessionId}`);
    }
  }, [sessionId, navigate]);

  return (
    <div className="max-w-md mx-auto p-6 bg-dark-card rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold text-dark-text mb-6 text-center">Crear Sesión</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre de la sesión (opcional)"
          placeholder="Mi sesión de música"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          disabled={isCreating}
        />

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" isLoading={isCreating} disabled={isCreating}>
          Crear Sesión
        </Button>
      </form>
    </div>
  );
}
