/**
 * Componente para mostrar el estado de la conexión
 */

import { useAppSelector } from '@app/hooks';
import { cn } from '@shared/utils';

export function ConnectionStatus() {
  const { isConnected, latency, lastError } = useAppSelector((state) => state.connection);

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-primary-600 animate-pulse-slow' : 'bg-red-500'
        )}
      />
      <span className={cn(isConnected ? 'text-primary-600' : 'text-red-400')}>
        {isConnected ? `Conectado (${latency}ms)` : 'Desconectado'}
      </span>
      {lastError && <span className="text-red-400 text-xs">({lastError})</span>}
    </div>
  );
}
