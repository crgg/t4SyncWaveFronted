import { AudioV2, Track } from '@/shared/types';
import { ICurrentTrack } from '../groups/groups.types';

class PlaylistAdapter {
  static toTrack(audio: AudioV2): Track {
    return {
      id: audio.id,
      url: audio.file_url,
      title: audio.title,
      artist: audio.artist,
      duration: audio.duration_ms / 1000,
      addedAt: new Date(audio.created_at).getTime(),
    };
  }
  static toCurrentTrack(audio: ICurrentTrack): Track {
    const isSpotify = audio.source === 'spotify';
    return {
      id: audio.id,
      url: isSpotify ? (audio.spotify_url ?? '') : audio.file_url,
      title: audio.title,
      artist: audio.artist,
      duration: audio.duration_ms / 1000,
      addedAt: new Date(audio.created_at).getTime(),
      source: isSpotify ? 'spotify' : 'file',
      spotifyId: isSpotify ? audio.spotify_id : undefined,
    };
  }
}

export default PlaylistAdapter;
