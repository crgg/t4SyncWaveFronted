/**
 * Servicio de audio
 * Maneja la reproducción y sincronización de audio
 */

import type { AudioState } from '@shared/types';
import { calculateLatency, clamp, isValidAudioUrl } from '@shared/utils';

class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onStateChange: ((state: AudioState) => void) | null = null;
  private currentState: AudioState | null = null;
  private latency = 0;
  private eventListeners: Map<string, EventListener> = new Map();

  /**
   * Inicializa el servicio de audio
   */
  init(audioUrl: string, onStateChange?: (state: AudioState) => void): void {
    // Validar que la URL no esté vacía
    if (!audioUrl || audioUrl.trim() === '') {
      console.warn('Intento de inicializar audio con URL vacía');
      if (onStateChange) {
        onStateChange({
          isPlaying: false,
          currentPosition: 0,
          volume: this.currentState?.volume ?? 100,
          trackId: '',
          trackUrl: '',
          timestamp: Date.now(),
          error: 'URL de audio vacía',
        } as any);
      }
      return;
    }

    // Validar que la URL sea válida antes de inicializar
    if (!isValidAudioUrl(audioUrl)) {
      console.warn(
        'Intento de inicializar audio con URL inválida:',
        audioUrl,
        'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
      );
      if (onStateChange) {
        onStateChange({
          isPlaying: false,
          currentPosition: 0,
          volume: this.currentState?.volume ?? 100,
          trackId: '',
          trackUrl: '',
          timestamp: Date.now(),
          error:
            'URL de audio no válida. Debe ser un archivo de audio válido (ej: .mp3, .wav, .ogg, etc.)',
        } as any);
      }
      return;
    }

    // Guardar volumen actual antes de limpiar
    const currentVolume = this.audioElement?.volume ?? (this.currentState?.volume ?? 100) / 100;

    // Limpiar elemento anterior si existe
    if (this.audioElement) {
      this.removeAudioListeners();
      this.cleanup();
    }

    // Crear nuevo elemento de audio con la URL
    this.audioElement = new Audio(audioUrl);
    this.onStateChange = onStateChange ?? null;

    // Establecer volumen guardado
    this.audioElement.volume = currentVolume;

    // Verificar que el src se estableció correctamente
    if (!this.audioElement.src || this.audioElement.src === '') {
      console.error('Error: El src del elemento de audio está vacío después de la inicialización');
      if (onStateChange) {
        onStateChange({
          isPlaying: false,
          currentPosition: 0,
          volume: this.currentState?.volume ?? 100,
          trackId: '',
          trackUrl: '',
          timestamp: Date.now(),
          error: 'Error al establecer la fuente de audio',
        } as any);
      }
      this.audioElement = null;
      return;
    }

    this.setupAudioListeners();
    this.startSyncMonitoring();
  }

  /**
   * Elimina los listeners del elemento de audio anterior
   */
  private removeAudioListeners(): void {
    if (!this.audioElement) return;

    // Eliminar todos los listeners registrados
    this.eventListeners.forEach((listener, event) => {
      this.audioElement?.removeEventListener(event, listener);
    });
    this.eventListeners.clear();
  }

  /**
   * Configura los listeners del elemento de audio
   */
  private setupAudioListeners(): void {
    if (!this.audioElement) return;

    // Limpiar listeners anteriores si existen
    this.removeAudioListeners();

    // Crear listeners y guardarlos para poder eliminarlos después
    const playHandler = () => {
      if (!this.audioElement) return;
      // Solo actualizar si no fue causado por nuestro código
      if (!(this.audioElement as any).__isUpdatingFromCode) {
        this.updateState({ isPlaying: true });
      }
    };

    const pauseHandler = () => {
      if (!this.audioElement) return;
      // Solo actualizar si no fue causado por nuestro código
      if (!(this.audioElement as any).__isUpdatingFromCode) {
        this.updateState({ isPlaying: false });
      }
    };

    const timeupdateHandler = () => {
      if (this.audioElement && !isNaN(this.audioElement.currentTime)) {
        this.updateState({
          currentPosition: this.audioElement.currentTime,
        });
      }
    };

    const loadedmetadataHandler = () => {
      if (this.audioElement && !isNaN(this.audioElement.duration)) {
        this.updateState({
          trackDuration: this.audioElement.duration,
        });
      }
    };

    const loadeddataHandler = () => {
      if (this.audioElement && !isNaN(this.audioElement.duration)) {
        this.updateState({
          trackDuration: this.audioElement.duration,
        });
      }
    };

    const canplayHandler = () => {
      if (this.audioElement && !isNaN(this.audioElement.duration)) {
        this.updateState({
          trackDuration: this.audioElement.duration,
        });

        // Si el estado actual indica que debería estar reproduciendo, reproducir automáticamente
        // Esto es importante para listeners que reciben el estado del servidor
        if (this.currentState?.isPlaying && this.audioElement.paused) {
          console.log('canplayHandler: Audio listo, reproduciendo automáticamente', {
            isPlaying: this.currentState.isPlaying,
            paused: this.audioElement.paused,
            readyState: this.audioElement.readyState,
            trackUrl: this.currentState.trackUrl,
          });
          // Esperar un poco para asegurar que el audio esté completamente listo
          setTimeout(() => {
            if (this.audioElement && this.currentState?.isPlaying && this.audioElement.paused) {
              console.log('canplayHandler: Intentando reproducir...');
              this.play().catch((error) => {
                console.error('Error al reproducir automáticamente después de canplay:', error);
              });
            }
          }, 200);
        } else {
          console.log('canplayHandler: No se reproduce automáticamente', {
            isPlaying: this.currentState?.isPlaying,
            paused: this.audioElement.paused,
            hasCurrentState: !!this.currentState,
          });
        }
      }
    };

    const errorHandler = (event: Event) => {
      const audioElement = event.target as HTMLAudioElement;

      // Verificar que el src no esté vacío antes de procesar el error
      if (
        !audioElement.src ||
        audioElement.src === '' ||
        audioElement.src === window.location.href
      ) {
        console.warn('Error de audio ignorado: src está vacío o es inválido', {
          src: audioElement.src,
          currentSrc: audioElement.currentSrc,
        });
        return;
      }

      let errorMessage = 'Error al cargar el audio';

      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'La carga del audio fue cancelada';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Error de red al cargar el audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Error al decodificar el audio';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'El formato de audio no es compatible o la URL no es válida';
            break;
          default:
            errorMessage = `Error desconocido (código: ${audioElement.error.code})`;
        }
      }

      console.error('Error en audio:', errorMessage, {
        code: audioElement.error?.code,
        message: audioElement.error?.message,
        src: audioElement.src,
        currentSrc: audioElement.currentSrc,
      });

      // Actualizar estado para indicar que hay un error
      this.updateState({
        isPlaying: false,
        error: errorMessage,
      } as any);
    };

    // Agregar listeners y guardarlos
    this.audioElement.addEventListener('play', playHandler);
    this.eventListeners.set('play', playHandler);

    this.audioElement.addEventListener('pause', pauseHandler);
    this.eventListeners.set('pause', pauseHandler);

    this.audioElement.addEventListener('timeupdate', timeupdateHandler);
    this.eventListeners.set('timeupdate', timeupdateHandler);

    this.audioElement.addEventListener('loadedmetadata', loadedmetadataHandler);
    this.eventListeners.set('loadedmetadata', loadedmetadataHandler);

    this.audioElement.addEventListener('loadeddata', loadeddataHandler);
    this.eventListeners.set('loadeddata', loadeddataHandler);

    this.audioElement.addEventListener('canplay', canplayHandler);
    this.eventListeners.set('canplay', canplayHandler);

    this.audioElement.addEventListener('error', errorHandler);
    this.eventListeners.set('error', errorHandler);
  }

  /**
   * Reproduce el audio
   */
  async play(): Promise<void> {
    if (!this.audioElement) {
      console.warn('Intento de reproducir audio no inicializado');
      return;
    }

    try {
      // Marcar que estamos actualizando desde código
      (this.audioElement as any).__isUpdatingFromCode = true;

      await this.audioElement.play();

      // Resetear flag después de un pequeño delay
      setTimeout(() => {
        if (this.audioElement) {
          (this.audioElement as any).__isUpdatingFromCode = false;
        }
      }, 100);
    } catch (error) {
      if (this.audioElement) {
        (this.audioElement as any).__isUpdatingFromCode = false;
      }
      console.error('Error al reproducir:', error);
      throw error;
    }
  }

  /**
   * Pausa el audio
   */
  pause(): void {
    if (!this.audioElement) {
      // Si el audio no está inicializado, simplemente retornar sin error
      console.warn('Intento de pausar audio no inicializado');
      return;
    }

    try {
      // Marcar que estamos actualizando desde código
      (this.audioElement as any).__isUpdatingFromCode = true;
      this.audioElement.pause();

      // Resetear flag después de un pequeño delay
      setTimeout(() => {
        if (this.audioElement) {
          (this.audioElement as any).__isUpdatingFromCode = false;
        }
      }, 100);
    } catch (error) {
      console.warn('Error al pausar audio:', error);
    }
  }

  /**
   * Cambia la posición del audio
   */
  seek(position: number): void {
    if (!this.audioElement) {
      console.warn('Intento de hacer seek en audio no inicializado');
      return;
    }
    try {
      this.audioElement.currentTime = clamp(position, 0, this.audioElement.duration || 0);
    } catch (error) {
      console.warn('Error al hacer seek:', error);
    }
  }

  /**
   * Cambia el volumen
   */
  setVolume(volume: number): void {
    if (!this.audioElement) {
      // Si el audio no está inicializado, guardar el volumen en el estado
      this.updateState({ volume: clamp(volume, 0, 100) });
      return;
    }
    const clampedVolume = clamp(volume, 0, 100) / 100;
    this.audioElement.volume = clampedVolume;
    this.updateState({ volume: clamp(volume, 0, 100) });
  }

  /**
   * Sincroniza con el estado del servidor
   */
  sync(
    serverPosition: number,
    serverTimestamp: number,
    isPlaying: boolean,
    trackUrl?: string
  ): void {
    // Si hay una nueva URL de track Y es diferente a la actual, reinicializar
    // IMPORTANTE: Solo reinicializar si realmente cambió la URL para evitar ciclos infinitos
    const currentTrackUrl = this.currentState?.trackUrl || '';
    const newTrackUrl = trackUrl?.trim() || '';

    if (newTrackUrl && newTrackUrl !== currentTrackUrl && newTrackUrl !== '') {
      // Verificar que realmente sea una URL diferente antes de reinicializar
      if (!this.audioElement || currentTrackUrl === '' || currentTrackUrl !== newTrackUrl) {
        console.log('sync: Inicializando audioService con nueva URL', {
          newTrackUrl,
          currentTrackUrl,
          isPlaying,
          serverPosition,
        });
        // IMPORTANTE: Establecer el estado interno ANTES de inicializar
        // para que canplayHandler pueda reproducir automáticamente si isPlaying es true
        if (!this.currentState) {
          this.currentState = {
            isPlaying: false,
            currentPosition: 0,
            volume: 100,
            trackId: '',
            trackUrl: '',
            timestamp: Date.now(),
          } as AudioState;
        }
        // Actualizar estado interno con los valores del servidor antes de inicializar
        this.currentState.isPlaying = isPlaying;
        this.currentState.currentPosition = serverPosition;
        this.currentState.trackUrl = newTrackUrl;
        this.currentState.timestamp = serverTimestamp;

        console.log('sync: Estado interno establecido antes de init', {
          isPlaying: this.currentState.isPlaying,
          trackUrl: this.currentState.trackUrl,
        });

        this.init(newTrackUrl, this.onStateChange || undefined);
        // No reproducir automáticamente al cambiar de track aquí
        // El canplayHandler lo hará si isPlaying es true
        return;
      }
    }

    if (!this.audioElement) {
      console.warn('AudioElement no está inicializado para sincronizar');
      return;
    }

    // Validar que el src esté establecido
    if (
      !this.audioElement.src ||
      this.audioElement.src === '' ||
      this.audioElement.src === window.location.href
    ) {
      console.warn('No se puede sincronizar: src no está establecido');
      return;
    }

    // Validar que haya duración válida antes de sincronizar posición
    const duration = this.audioElement.duration;

    // IMPORTANTE: Aunque no haya duración aún, debemos sincronizar el estado de reproducción
    // para que el audio comience a reproducirse cuando el servidor lo indique
    if (!duration || isNaN(duration) || duration <= 0) {
      // Si no hay duración aún pero el servidor dice que está reproduciendo,
      // intentar reproducir de todas formas (el audio puede estar cargando)
      const wasPlaying = !this.audioElement.paused;
      if (isPlaying !== wasPlaying) {
        if (isPlaying && this.audioElement.paused) {
          // Esperar a que el audio esté listo antes de reproducir
          const tryPlayWhenReady = () => {
            if (!this.audioElement) return;
            if (this.audioElement.readyState >= 2) {
              // HAVE_CURRENT_DATA o superior - suficiente para reproducir
              this.play().catch((error) => {
                console.error('Error al reproducir durante sync (sin duración):', error);
              });
            } else if (this.audioElement.readyState < 2 && isPlaying) {
              // Aún no está listo, esperar más (máximo 5 segundos)
              setTimeout(tryPlayWhenReady, 100);
            }
          };
          tryPlayWhenReady();
        } else if (!isPlaying && !this.audioElement.paused) {
          this.pause();
        }
      }
      return; // No sincronizar posición sin duración
    }

    // Calcular latencia
    const clientTimestamp = Date.now();
    this.latency = calculateLatency(serverTimestamp, clientTimestamp);

    // Calcular posición objetivo considerando latencia
    const timeSinceUpdate = (Date.now() - serverTimestamp) / 1000;
    let targetPosition = serverPosition + timeSinceUpdate;

    // Asegurar que la posición objetivo esté dentro de los límites válidos
    targetPosition = Math.max(0, Math.min(targetPosition, duration));

    // Verificar si necesita sincronización de posición
    const currentPosition = this.audioElement.currentTime;

    // Solo sincronizar si la diferencia es significativa (más de 0.5 segundos)
    const difference = Math.abs(currentPosition - targetPosition);
    const SYNC_THRESHOLD_SECONDS = 0.5;

    if (difference > SYNC_THRESHOLD_SECONDS && !isNaN(targetPosition) && targetPosition >= 0) {
      // Re-sincronizar posición solo si la diferencia es significativa
      // y la posición objetivo es válida
      try {
        this.audioElement.currentTime = targetPosition;
      } catch (error) {
        console.error('Error al establecer currentTime durante sincronización:', error);
      }
    }

    // Sincronizar estado de reproducción
    // IMPORTANTE: Para listeners, debemos sincronizar el estado de reproducción
    const wasPlaying = !this.audioElement.paused;
    if (isPlaying !== wasPlaying) {
      if (isPlaying && this.audioElement.paused) {
        // Reproducir si el servidor dice que está reproduciendo
        // Verificar que el audio esté listo antes de reproducir
        if (this.audioElement.readyState >= 2) {
          // HAVE_CURRENT_DATA o superior - suficiente para reproducir
          this.play().catch((error) => {
            console.error('Error al reproducir durante sincronización:', error);
          });
        } else {
          // Esperar a que el audio esté listo
          const tryPlayWhenReady = () => {
            if (!this.audioElement) return;
            if (this.audioElement.readyState >= 2 && this.audioElement.paused && isPlaying) {
              this.play().catch((error) => {
                console.error('Error al reproducir cuando el audio está listo:', error);
              });
            } else if (this.audioElement.readyState < 2) {
              // Aún no está listo, esperar más
              setTimeout(tryPlayWhenReady, 100);
            }
          };
          tryPlayWhenReady();
        }
      } else if (!isPlaying && !this.audioElement.paused) {
        // Pausar si el servidor dice que está pausado
        this.pause();
      }
    }

    // Actualizar estado interno con la posición actual del audioElement
    // Esto es necesario para mantener el estado sincronizado
    // PERO no llamamos updateState() aquí para evitar ciclos infinitos
    // El estado se actualiza a través de los event listeners (timeupdate, play, pause)
    // Solo actualizamos el estado interno para referencia
    if (this.currentState) {
      this.currentState.currentPosition = this.audioElement.currentTime;
      this.currentState.isPlaying = !this.audioElement.paused;
      // IMPORTANTE: Actualizar también el estado interno con el isPlaying del servidor
      // para que canplayHandler pueda reproducir automáticamente si es necesario
      this.currentState.isPlaying = isPlaying;
    }
  }

  /**
   * Inicia el monitoreo de sincronización
   * NOTA: Este método está deshabilitado porque causa problemas de sincronización
   * La sincronización se maneja explícitamente a través del método sync()
   */
  private startSyncMonitoring(): void {
    // Deshabilitado para evitar problemas de sincronización
    // La sincronización se maneja explícitamente a través del método sync()
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Actualiza el estado y notifica a los listeners
   */
  private updateState(updates: Partial<AudioState & { error?: string }>): void {
    if (!this.currentState) {
      this.currentState = {
        isPlaying: false,
        currentPosition: 0,
        volume: 100,
        trackId: '',
        trackUrl: '',
        timestamp: Date.now(),
        ...updates,
      } as AudioState;
    } else {
      // Actualizar estado
      this.currentState = {
        ...this.currentState,
        ...updates,
      } as AudioState;

      // Actualizar timestamp para cambios importantes
      if (updates.currentPosition !== undefined || updates.isPlaying !== undefined) {
        this.currentState.timestamp = Date.now();
      }
    }

    // Notificar cambios solo si hay un callback y el estado es válido
    if (this.onStateChange && this.currentState) {
      // Validar que los valores sean válidos antes de notificar
      const validState: AudioState & { error?: string } = {
        ...this.currentState,
        currentPosition: isNaN(this.currentState.currentPosition)
          ? 0
          : Math.max(0, this.currentState.currentPosition),
        trackDuration:
          this.currentState.trackDuration && !isNaN(this.currentState.trackDuration)
            ? Math.max(0, this.currentState.trackDuration)
            : undefined,
      };

      // Incluir error si existe en los updates
      if ((updates as any).error) {
        (validState as any).error = (updates as any).error;
      }

      this.onStateChange(validState);
    }
  }

  /**
   * Obtiene el estado actual
   */
  getState(): AudioState | null {
    return this.currentState;
  }

  /**
   * Obtiene la latencia actual
   */
  getLatency(): number {
    return this.latency;
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.audioElement) {
      // Eliminar listeners antes de limpiar el src
      this.removeAudioListeners();

      // Pausar y limpiar
      this.audioElement.pause();
      // Establecer src a cadena vacía para liberar recursos
      // pero solo después de eliminar los listeners
      this.audioElement.src = '';
      // Cargar con src vacío para asegurar que se limpia completamente
      this.audioElement.load();
      this.audioElement = null;
    }

    this.currentState = null;
    this.onStateChange = null;
  }
}

// Singleton instance
let instance: AudioService | null = null;

export function getAudioService(): AudioService {
  if (!instance) {
    instance = new AudioService();
  }
  return instance;
}

export default AudioService;
