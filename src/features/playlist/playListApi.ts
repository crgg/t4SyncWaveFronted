import { http } from '@app/http';
import PlaylistAdapter from './playlistAdapter';

class PlayListApi {
  async getPlaylist() {
    const { data: response } = await http.get('/audio_test/list_all_by_user');
    // const response = await http.get('/audio/list');
    if (response.status) {
      return response.audio.map(PlaylistAdapter.toTrack);
    }
    return [];
  }
}

export const playListApi = new PlayListApi();
