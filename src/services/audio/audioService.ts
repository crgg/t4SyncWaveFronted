import type { AudioState } from '@shared/types';
import { calculateLatency, clamp, isValidAudioUrl } from '@shared/utils';

class AudioService {
  private audioElement: HTMLAudioElement | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onStateChange: ((state: AudioState) => void) | null = null;
  private currentState: AudioState | null = null;
  private latency = 0;
  private eventListeners: Map<string, EventListener> = new Map();

  init(audioUrl: string, onStateChange?: (state: AudioState) => void): void {
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

    const currentVolume = this.audioElement?.volume ?? (this.currentState?.volume ?? 100) / 100;

    if (this.audioElement) {
      this.removeAudioListeners();
      this.cleanup();
    }

    this.audioElement = new Audio(audioUrl);
    this.onStateChange = onStateChange ?? null;

    this.audioElement.volume = currentVolume;

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

  private removeAudioListeners(): void {
    if (!this.audioElement) return;

    this.eventListeners.forEach((listener, event) => {
      this.audioElement?.removeEventListener(event, listener);
    });
    this.eventListeners.clear();
  }

  private setupAudioListeners(): void {
    if (!this.audioElement) return;

    this.removeAudioListeners();

    const playHandler = () => {
      if (!this.audioElement) return;
      if (!(this.audioElement as any).__isUpdatingFromCode) {
        this.updateState({ isPlaying: true });
      }
    };

    const pauseHandler = () => {
      if (!this.audioElement) return;
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

        if (this.currentState?.isPlaying && this.audioElement.paused) {
          const tryPlay = () => {
            if (!this.audioElement || !this.currentState) return;
            if (
              this.audioElement.readyState >= 2 &&
              this.currentState.isPlaying &&
              this.audioElement.paused
            ) {
              if (
                this.currentState.currentPosition > 0 &&
                !isNaN(this.currentState.currentPosition)
              ) {
                try {
                  const targetPosition = Math.max(
                    0,
                    Math.min(this.currentState.currentPosition, this.audioElement.duration)
                  );
                  this.audioElement.currentTime = targetPosition;
                } catch (error) {
                  console.error('Error al establecer posición en canplay:', error);
                }
              }
              this.play().catch((error) => {
                console.error('Error al reproducir automáticamente después de canplay:', error);
              });
            } else if (this.audioElement.readyState < 2 && this.currentState.isPlaying) {
              setTimeout(tryPlay, 100);
            }
          };
          setTimeout(tryPlay, 100);
        }
      }
    };

    const errorHandler = (event: Event) => {
      const audioElement = event.target as HTMLAudioElement;

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

      this.updateState({
        isPlaying: false,
        error: errorMessage,
      } as any);
    };

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

    const canplaythroughHandler = () => {
      if (this.audioElement && this.currentState?.isPlaying && this.audioElement.paused) {
        if (this.currentState.currentPosition > 0 && !isNaN(this.currentState.currentPosition)) {
          try {
            const targetPosition = Math.max(
              0,
              Math.min(this.currentState.currentPosition, this.audioElement.duration || 0)
            );
            this.audioElement.currentTime = targetPosition;
          } catch (error) {
            console.error('Error al establecer posición en canplaythrough:', error);
          }
        }
        this.play().catch((error) => {
          console.error('Error al reproducir automáticamente después de canplaythrough:', error);
        });
      }
    };

    this.audioElement.addEventListener('canplaythrough', canplaythroughHandler);
    this.eventListeners.set('canplaythrough', canplaythroughHandler);

    this.audioElement.addEventListener('error', errorHandler);
    this.eventListeners.set('error', errorHandler);
  }

  async play(): Promise<void> {
    if (!this.audioElement) {
      console.warn('Intento de reproducir audio no inicializado');
      return;
    }

    try {
      (this.audioElement as any).__isUpdatingFromCode = true;

      await this.audioElement.play();

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

  pause(): void {
    if (!this.audioElement) {
      console.warn('Intento de pausar audio no inicializado');
      return;
    }

    try {
      (this.audioElement as any).__isUpdatingFromCode = true;
      this.audioElement.pause();

      setTimeout(() => {
        if (this.audioElement) {
          (this.audioElement as any).__isUpdatingFromCode = false;
        }
      }, 100);
    } catch (error) {
      console.warn('Error al pausar audio:', error);
    }
  }

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

  setVolume(volume: number): void {
    if (!this.audioElement) {
      this.updateState({ volume: clamp(volume, 0, 100) });
      return;
    }
    const clampedVolume = clamp(volume, 0, 100) / 100;
    this.audioElement.volume = clampedVolume;
    this.updateState({ volume: clamp(volume, 0, 100) });
  }

  sync(
    serverPosition: number,
    serverTimestamp: number,
    isPlaying: boolean,
    trackUrl?: string
  ): void {
    const currentTrackUrl = this.currentState?.trackUrl || '';
    const newTrackUrl = trackUrl?.trim() || '';

    if (newTrackUrl && newTrackUrl !== '') {
      const shouldInitialize =
        !this.audioElement || currentTrackUrl === '' || currentTrackUrl !== newTrackUrl;

      if (shouldInitialize) {
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
        this.currentState.isPlaying = isPlaying;
        this.currentState.currentPosition = serverPosition;
        this.currentState.trackUrl = newTrackUrl;
        this.currentState.timestamp = serverTimestamp;

        this.init(newTrackUrl, this.onStateChange || undefined);

        if (isPlaying) {
          const trySyncAfterInit = () => {
            if (!this.audioElement || !this.currentState) return;
            if (this.audioElement.readyState >= 2) {
              if (
                this.audioElement.duration &&
                !isNaN(this.audioElement.duration) &&
                this.audioElement.duration > 0
              ) {
                const targetPosition = Math.max(
                  0,
                  Math.min(serverPosition, this.audioElement.duration)
                );
                try {
                  (this.audioElement as any).__isUpdatingFromCode = true;
                  this.audioElement.currentTime = targetPosition;
                  setTimeout(() => {
                    if (this.audioElement) {
                      (this.audioElement as any).__isUpdatingFromCode = false;
                    }
                  }, 100);
                } catch (error) {
                  console.error('Error al establecer posición inicial:', error);
                  if (this.audioElement) {
                    (this.audioElement as any).__isUpdatingFromCode = false;
                  }
                }
              }
              if (this.currentState.isPlaying && this.audioElement.paused) {
                this.play().catch((error) => {
                  console.error('Error al reproducir después de inicializar:', error);
                });
              }
            } else if (this.audioElement.readyState < 2 && this.currentState.isPlaying) {
              setTimeout(trySyncAfterInit, 100);
            }
          };
          setTimeout(trySyncAfterInit, 200);
        }
        return;
      }
    }

    if (!this.audioElement) {
      console.warn('AudioElement no está inicializado para sincronizar');
      return;
    }

    if (
      !this.audioElement.src ||
      this.audioElement.src === '' ||
      this.audioElement.src === window.location.href
    ) {
      console.warn('No se puede sincronizar: src no está establecido');
      return;
    }

    const duration = this.audioElement.duration;

    if (!duration || isNaN(duration) || duration <= 0) {
      const wasPlaying = !this.audioElement.paused;
      if (isPlaying !== wasPlaying) {
        if (isPlaying && this.audioElement.paused) {
          const tryPlayWhenReady = () => {
            if (!this.audioElement) return;
            if (this.audioElement.readyState >= 2) {
              this.play().catch((error) => {
                console.error('Error al reproducir durante sync (sin duración):', error);
              });
            } else if (this.audioElement.readyState < 2 && isPlaying) {
              setTimeout(tryPlayWhenReady, 100);
            }
          };
          tryPlayWhenReady();
        } else if (!isPlaying && !this.audioElement.paused) {
          this.pause();
        }
      }
      if (this.currentState) {
        this.currentState.currentPosition = serverPosition;
        this.currentState.isPlaying = isPlaying;
      }
      return;
    }

    const clientTimestamp = Date.now();
    this.latency = calculateLatency(serverTimestamp, clientTimestamp);

    const timeSinceUpdate = (Date.now() - serverTimestamp) / 1000;
    let targetPosition = serverPosition + timeSinceUpdate;

    targetPosition = Math.max(0, Math.min(targetPosition, duration));

    const currentPosition = this.audioElement.currentTime;

    const difference = Math.abs(currentPosition - targetPosition);
    const SYNC_THRESHOLD_SECONDS = 0.2;

    if (difference > SYNC_THRESHOLD_SECONDS && !isNaN(targetPosition) && targetPosition >= 0) {
      try {
        (this.audioElement as any).__isUpdatingFromCode = true;
        this.audioElement.currentTime = targetPosition;

        setTimeout(() => {
          if (this.audioElement) {
            (this.audioElement as any).__isUpdatingFromCode = false;
          }
        }, 100);
      } catch (error) {
        console.error('Error al establecer currentTime durante sincronización:', error);
        if (this.audioElement) {
          (this.audioElement as any).__isUpdatingFromCode = false;
        }
      }
    }

    const wasPlaying = !this.audioElement.paused;
    if (isPlaying !== wasPlaying) {
      if (isPlaying && this.audioElement.paused) {
        if (this.audioElement.readyState >= 2) {
          this.play().catch((error) => {
            console.error('Error al reproducir durante sincronización:', error);
          });
        } else {
          const tryPlayWhenReady = () => {
            if (!this.audioElement) return;
            if (this.audioElement.readyState >= 2 && this.audioElement.paused && isPlaying) {
              this.play().catch((error) => {
                console.error('Error al reproducir cuando el audio está listo:', error);
              });
            } else if (this.audioElement.readyState < 2 && isPlaying) {
              setTimeout(tryPlayWhenReady, 100);
            }
          };
          tryPlayWhenReady();
        }
      } else if (!isPlaying && !this.audioElement.paused) {
        this.pause();
      }
    }

    if (this.currentState) {
      this.currentState.currentPosition = this.audioElement.currentTime;
      this.currentState.isPlaying = !this.audioElement.paused;
      this.currentState.isPlaying = isPlaying;
    }
  }

  private startSyncMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

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

      if (updates.currentPosition !== undefined || updates.isPlaying !== undefined) {
        this.currentState.timestamp = Date.now();
      }
    }

    if (this.onStateChange && this.currentState) {
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

      if ((updates as any).error) {
        (validState as any).error = (updates as any).error;
      }

      this.onStateChange(validState);
    }
  }

  getState(): AudioState | null {
    return this.currentState;
  }

  getLatency(): number {
    return this.latency;
  }

  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.audioElement) {
      this.removeAudioListeners();

      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
      this.audioElement = null;
    }

    this.currentState = null;
    this.onStateChange = null;
  }
}

let instance: AudioService | null = null;

export function getAudioService(): AudioService {
  if (!instance) {
    instance = new AudioService();
  }
  return instance;
}

export default AudioService;
