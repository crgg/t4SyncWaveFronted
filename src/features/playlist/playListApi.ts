import { http } from '@app/http';

class PlayListApi {
  async getPlaylist() {
    const response = await http.get('/audio/list');
    return response.data;
  }
}

export const playListApi = new PlayListApi();
