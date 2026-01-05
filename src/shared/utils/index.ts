/**
 * Utilidades compartidas
 */

import { AxiosError } from 'axios';
import { clsx, type ClassValue } from 'clsx';

/**
 * Combina clases CSS de forma condicional
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Genera un ID único
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formatea el tiempo en formato MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calcula la latencia de red (RTT)
 */
export function calculateLatency(serverTimestamp: number, clientTimestamp: number): number {
  return Math.abs(Date.now() - serverTimestamp - (Date.now() - clientTimestamp)) / 2;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Valida si una URL es válida para audio
 * @param url La URL a validar
 * @returns true si la URL es válida para audio, false en caso contrario
 */
export function isValidAudioUrl(url: string): boolean {
  if (!url || url.trim() === '') {
    return false;
  }

  // Rechazar rutas de la aplicación
  if (
    url.startsWith('/host/') ||
    url.startsWith('/listener/') ||
    url.includes('/host/') ||
    url.includes('/listener/')
  ) {
    return false;
  }

  // Rechazar URLs que parecen ser rutas de la aplicación (con localhost y rutas)
  try {
    const urlObj = new URL(url);
    if (
      (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') &&
      (urlObj.pathname.startsWith('/host/') || urlObj.pathname.startsWith('/listener/'))
    ) {
      return false;
    }
  } catch {
    // Si no es una URL válida, podría ser una ruta relativa
    // Rechazar si parece ser una ruta de la app
    if (url.startsWith('/host/') || url.startsWith('/listener/')) {
      return false;
    }
  }

  // Extensiones de audio válidas
  const audioExtensions = [
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.aac',
    '.flac',
    '.webm',
    '.opus',
    '.mp4', // Algunos archivos MP4 pueden contener solo audio
  ];

  // Verificar si la URL tiene una extensión de audio válida
  const lowerUrl = url.toLowerCase();
  const hasAudioExtension = audioExtensions.some((ext) => lowerUrl.includes(ext));

  // Si tiene extensión de audio, es válida
  if (hasAudioExtension) {
    return true;
  }

  // Si no tiene extensión pero es una URL HTTP/HTTPS válida, también puede ser válida
  // (algunos servidores sirven audio sin extensión o con parámetros)
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      // Permitir URLs HTTP/HTTPS que no sean rutas de la app
      return true;
    }
  } catch {
    // Si no es una URL válida y no tiene extensión, rechazar
    return false;
  }

  return false;
}

export function getInitials(name?: string): string {
  if (!name) return '';

  const [firstName] = name.trim().split(' ');

  return firstName[0].toUpperCase();
  // const [firstName, ...others] = name.trim().split(' ');

  // return `${firstName} ${others.map((n) => n[0].toUpperCase()).join('')}`;
}

export function validationIsObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Failed to perform action. Please try again.';
  if (error instanceof AxiosError) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.msg ||
      'An unknown error occurred'
    );
  } else if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const orderBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return array.sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return direction === 'asc' ? 0 : 0;
  }) as T[];
};

export const msToSeconds = (ms: number): number => {
  return ms / 1000;
};
