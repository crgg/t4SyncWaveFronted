import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { dispatchSpotifyDisconnected } from '@/features/spotify/components/SpotifyAccountCard';

import { SPOTIFY_CONFIG, SPOTIFY_STORAGE_KEYS } from '@/features/spotify/constants';
import { generatePKCE, getValidSpotifyToken } from '@/features/spotify/spotifyAuth';
import * as SpotifyApi from '@/features/spotify/spotifyApi';
import {
  getDeviceIdFromApi,
  spotifyDeviceId,
  transferPlaybackToDevices,
} from '@/features/spotify/spotifyPlayerService';
import { useAppSelector } from '@/app/hooks';

interface Propss {
  isSpotifyOnly: boolean;
  groupId?: string;
}

const Example = ({ groupId, isSpotifyOnly }: Propss) => {
  const audioState = useAppSelector((state) => state.audio);

  // Transfer Playback state
  const [deviceIds, setDeviceIds] = useState<string[]>(['']);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  useQuery({
    queryKey: ['group-spotify-status', groupId],
    queryFn: () => SpotifyApi.getGroupSpotifyStatus(groupId as string),
    staleTime: 1000 * 5,
    gcTime: 1000 * 5,
    refetchInterval: 1000 * 5,
    enabled: !!groupId && isSpotifyOnly,
  });

  const handleConnectSpotify = async () => {
    if (!groupId) return;
    const { REDIRECT_URI } = SPOTIFY_CONFIG;
    try {
      const { codeVerifier, codeChallenge } = await generatePKCE();
      sessionStorage.setItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);

      const { status = false, authUrl } = await SpotifyApi.getGroupSpotifyConnect(groupId, {
        redirectUri: REDIRECT_URI,
      });

      if (!status || !authUrl) {
        toast.error('Failed to connect Spotify');
        sessionStorage.removeItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER);
        return;
      }

      const url = new URL(decodeURIComponent(authUrl));
      url.searchParams.set('redirect_uri', REDIRECT_URI);
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('code_challenge', codeChallenge);
      toast.success('Redirecting to Spotify...');
      window.location.href = url.toString();
    } catch (err) {
      toast.error('Failed to connect Spotify');
      sessionStorage.removeItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER);
    }
  };

  const handleDisconnectSpotify = () => {
    if (!groupId) return;
    SpotifyApi.postGroupSpotifyDisconnect(groupId).then(({ status = false }) => {
      if (status) {
        toast.success('Spotify disconnected successfully');
        localStorage.removeItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(SPOTIFY_STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(SPOTIFY_STORAGE_KEYS.EXPIRES_AT);
        sessionStorage.removeItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER);
        dispatchSpotifyDisconnected();
      } else {
        toast.error('Failed to disconnect Spotify');
      }
    });
  };

  const handleGetDevices = async () => {
    const token = await getValidSpotifyToken();
    if (!token) {
      toast.error('Failed to get devices');
      return;
    }

    const devices = await getDeviceIdFromApi(token);
    console.log({ devices, spotifyDeviceId });
  };

  const handleTransfer = async () => {
    const validIds = deviceIds.map((id) => id.trim()).filter(Boolean);
    if (!validIds.length) {
      toast.error('Enter at least one device ID');
      return;
    }
    if (!audioState.spotifyId) {
      toast.error('No Spotify track is currently loaded');
      return;
    }

    setIsTransferring(true);
    try {
      const positionMs = Math.floor((audioState.currentPosition ?? 0) * 1000);
      await transferPlaybackToDevices(validIds, audioState.spotifyId, positionMs);
      toast.success(`Playback transferred to ${validIds.length} device(s)`);
    } catch (err) {
      toast.error('Transfer failed');
      console.error('Transfer error:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  const addDeviceField = () => setDeviceIds((prev) => [...prev, '']);
  const removeDeviceField = (index: number) =>
    setDeviceIds((prev) => prev.filter((_, i) => i !== index));
  const updateDeviceId = (index: number, value: string) =>
    setDeviceIds((prev) => prev.map((id, i) => (i === index ? value : id)));

  if (!isSpotifyOnly) return null;

  return (
    <div className="text-sm my-4 space-y-2">
      {/* Main action buttons */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          className="btn bg-slate-500/10 border border-slate-500 text-slate-700 hidden"
          onClick={handleGetDevices}
        >
          Get Devices
        </button>
        <button
          className="btn bg-violet-500/10 border border-violet-500 text-violet-700 dark:text-violet-400 hidden"
          onClick={() => setShowTransfer((v) => !v)}
        >
          Transfer Playback
        </button>
        <button
          className="btn bg-emerald-500/10 border border-emerald-500 text-emerald-700"
          onClick={handleConnectSpotify}
        >
          Connect Spotify
        </button>
        <button
          className="btn bg-red-500/10 border border-red-500 text-red-700"
          onClick={handleDisconnectSpotify}
        >
          Disconnect Spotify
        </button>
      </div>

      {/* Transfer Playback panel */}
      {showTransfer && (
        <div className="border border-violet-300 dark:border-violet-700 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-violet-800 dark:text-violet-300 text-xs uppercase tracking-wide">
              Transfer Playback
            </span>
            {audioState.spotifyId && (
              <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[160px]">
                track: {audioState.spotifyId}
              </span>
            )}
          </div>

          {/* Host device ID for reference */}
          {spotifyDeviceId && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="shrink-0">Your device:</span>
              <span
                className="font-mono truncate cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(spotifyDeviceId!);
                  toast.success('Host device ID copied');
                }}
              >
                {spotifyDeviceId}
              </span>
            </div>
          )}

          {/* Listener device ID inputs */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-500">Listener device IDs:</span>
            {deviceIds.map((id, index) => (
              <div key={index} className="flex gap-1.5">
                <input
                  type="text"
                  value={id}
                  onChange={(e) => updateDeviceId(index, e.target.value)}
                  placeholder="Spotify device ID…"
                  className="flex-1 px-2 py-1 text-xs font-mono rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                {deviceIds.length > 1 && (
                  <button
                    onClick={() => removeDeviceField(index)}
                    className="px-2 text-red-400 hover:text-red-600 transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addDeviceField}
              className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline"
            >
              + Add device
            </button>
          </div>

          <button
            onClick={handleTransfer}
            disabled={isTransferring || !audioState.spotifyId}
            className="w-full py-1.5 rounded bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            {isTransferring ? 'Transferring…' : 'Transfer Now'}
          </button>

          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Pushes the current Spotify track to the listed device IDs. Devices must belong to the
            same Spotify account as the host.
          </p>
        </div>
      )}
    </div>
  );
};

export default Example;
