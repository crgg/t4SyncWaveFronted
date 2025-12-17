/**
 * Formulario para unirse a una sesión existente (Listener)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { joinSessionStart } from '@features/session/sessionSlice';
import { useWebSocket } from '@shared/hooks/useWebSocket';
import { Button } from '@shared/components/Button/Button';
import { Input } from '@shared/components/Input/Input';

export function JoinSessionForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { joinSession } = useWebSocket();
  const { isJoining, error, sessionId } = useAppSelector((state) => state.session);
  const [sessionIdInput, setSessionIdInput] = useState('Spotty-Fredy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionIdInput.trim()) return;

    dispatch(joinSessionStart({ sessionId: sessionIdInput.trim() }));
    joinSession(sessionIdInput.trim());
  };

  // Redirigir cuando se una a la sesión (usando useEffect para evitar actualización durante render)
  useEffect(() => {
    if (sessionId) {
      navigate(`/listener/${sessionId}`);
    }
  }, [sessionId, navigate]);

  return (
    <div className="max-w-md mx-auto p-6 bg-dark-card rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold text-dark-text mb-6 text-center">Unirse a Sesión</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ID de Sesión"
          placeholder="Ingresa el ID de la sesión"
          value={sessionIdInput}
          onChange={(e) => setSessionIdInput(e.target.value)}
          disabled={isJoining}
          required
        />

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          isLoading={isJoining}
          disabled={isJoining || !sessionIdInput.trim()}
        >
          Unirse
        </Button>
      </form>
    </div>
  );
}
