import { AudioV2, Track } from '@/shared/types';

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
}

export default PlaylistAdapter;
