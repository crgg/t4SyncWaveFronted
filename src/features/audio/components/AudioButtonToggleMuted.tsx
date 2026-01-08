import { Volumen } from '@/shared/icons/Icons';

interface Props {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
}

const AudioButtonToggleMuted = ({ isMuted, volume, toggleMute }: Props) => {
  return (
    <>
      <button
        role="button"
        onClick={toggleMute}
        className="p-2 rounded-full transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        <Volumen volume={volume} muted={isMuted} className="sm:w-5 sm:h-5 w-4 h-4" />
      </button>
    </>
  );
};

export default AudioButtonToggleMuted;
