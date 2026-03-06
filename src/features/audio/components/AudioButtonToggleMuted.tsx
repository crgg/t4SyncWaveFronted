import { Volumen } from '@/shared/icons/Icons';

interface Props {
  disabledControls?: boolean;
  toggleMute: () => void;
  isMuted: boolean;
  volume: number;
}

const AudioButtonToggleMuted = ({
  isMuted,
  volume,
  toggleMute,
  disabledControls = false,
}: Props) => {
  return (
    <>
      <button
        role="button"
        onClick={toggleMute}
        className="p-2 rounded-full enabled:hover:bg-light-hover dark:enabled:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isMuted ? 'Unmute' : 'Mute'}
        disabled={disabledControls}
      >
        <Volumen volume={volume} muted={isMuted} className="sm:w-5 sm:h-5 w-4 h-4" />
      </button>
    </>
  );
};

export default AudioButtonToggleMuted;
