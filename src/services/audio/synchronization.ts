/**
 * Utilidades para sincronización de audio
 */

import { SYNC_CONFIG } from '@shared/constants';

/**
 * Calcula la posición objetivo considerando la latencia
 */
export function calculateTargetPosition(
  serverPosition: number,
  serverTimestamp: number,
  latency: number
): number {
  const timeSinceUpdate = (Date.now() - serverTimestamp) / 1000;
  return serverPosition + timeSinceUpdate + latency / 1000;
}

/**
 * Verifica si necesita re-sincronización
 */
export function needsResync(currentPosition: number, targetPosition: number): boolean {
  const difference = Math.abs(currentPosition - targetPosition) * 1000;
  return difference > SYNC_CONFIG.SYNC_THRESHOLD;
}

/**
 * Calcula el offset de sincronización
 */
export function calculateSyncOffset(currentPosition: number, targetPosition: number): number {
  return (targetPosition - currentPosition) * 1000; // en ms
}

/**
 * Ajusta el buffer según la latencia
 */
export function calculateBufferSize(latency: number): number {
  if (latency < 100) {
    return SYNC_CONFIG.BUFFER_SIZE;
  } else if (latency < 300) {
    return SYNC_CONFIG.BUFFER_SIZE * 1.5;
  } else {
    return SYNC_CONFIG.BUFFER_SIZE * 2;
  }
}
