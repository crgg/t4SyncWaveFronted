export {};

declare global {
  interface ResponseBase {
    status: boolean;
    error?: string;
  }

  interface IResponseErrorBase {
    status: boolean;
    error: string;
    msg?: string;
  }

  interface IResponseBase<T> {
    status: boolean;
    data: T;
  }

  interface IUserData {
    authProviders: Array<'email' | 'phone'>;
    hasPassword: boolean;
    id: string;
    name: string | null;
    nickname?: string;
    email: string | null;
    phone?: string;
    avatar_url?: string;
    created_at?: string;
    displayName: string;
  }

  type TDialogVariant = 'red' | 'emerald';

  interface Window {
    YT: typeof YT;
  }

  declare namespace YT {
    interface PlayerOptions {
      height?: string;
      width?: string;
      videoId?: string;
      playerVars?: {
        autoplay?: 0 | 1;
        controls?: 0 | 1 | 2;
        loop?: 0 | 1;
        listType?: string;
        list?: string;
        [key: string]: any;
      };
      events?: {
        onReady?(event: YT.PlayerEvent): void;
        onStateChange?(event: YT.OnStateChangeEvent): void;
        onPlaybackQualityChange?(event: YT.PlayerEvent): void;
        onPlaybackRateChange?(event: YT.PlayerEvent): void;
        onError?(event: YT.OnErrorEvent): void;
        onApiChange?(event: YT.PlayerEvent): void;
      };
      host?: string;
    }

    interface PlayerEvent {
      target: Player;
      data?: any;
    }

    interface OnStateChangeEvent extends PlayerEvent {
      data: YT.PlayerState;
    }

    interface OnErrorEvent extends PlayerEvent {
      data: YT.PlayerError;
    }

    class Player {
      constructor(elementId: string | HTMLElement, options?: PlayerOptions);
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
      cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
      getPlayerState(): YT.PlayerState;
      getCurrentTime(): number;
      getDuration(): number;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      setVolume(volume: number): void;
      getVolume(): number;
      // ... agregar más métodos si lo necesitas ...
    }

    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }

    enum PlayerError {
      INVALID_PARAM = 2,
      HTML5_ERROR = 5,
      VIDEO_NOT_FOUND = 100,
      NOT_PLAYABLE_IN_EMBEDDED = 101,
      NOT_PLAYABLE_ON_DOMAINS = 150,
    }

    // La función global de callback que crea el API script
    function ready(callback: () => void): void;
  }
}
