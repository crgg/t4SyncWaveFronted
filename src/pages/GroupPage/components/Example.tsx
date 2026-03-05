import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { dispatchSpotifyDisconnected } from '@/features/spotify/components/SpotifyAccountCard';

import { SPOTIFY_CONFIG, SPOTIFY_STORAGE_KEYS } from '@/features/spotify/constants';
import { generatePKCE } from '@/features/spotify/spotifyAuth';
import * as SpotifyApi from '@/features/spotify/spotifyApi';

interface Propss {
  isSpotifyOnly: boolean;
  groupId: string;
}

const Example = ({ groupId, isSpotifyOnly }: Propss) => {
  useQuery({
    queryKey: ['group-spotify-status', groupId],
    queryFn: () => SpotifyApi.getGroupSpotifyStatus(groupId),
    staleTime: 1000 * 5,
    gcTime: 1000 * 5,
    refetchInterval: 1000 * 5,
    enabled: !!groupId && isSpotifyOnly,
  });

  const handleConnectSpotify = async () => {
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

  return (
    <div className="text-sm items-center justify-end gap-2 my-4 flex">
      <button
        className="btn bg-emerald-500/10  border border-emerald-500 text-emerald-700"
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
  );
};

export default Example;
