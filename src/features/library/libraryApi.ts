import { http } from '@app/http';

export interface Audio {
  id: string;
  title: string;
  artist: string;
  file_url: string;
  duration_ms: number;
  added_by: string;
  uploaded_by: string;
  created_at: string;
  groups: Group[];
}

export interface Group {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  current_track_id: any;
  current_time_ms: number;
  is_playing: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  state: string;
  control_locked: boolean;
  last_dj_active: string;
  host_id: any;
}

export interface LibraryResponse {
  status: boolean;
  audio: Audio[];
}

class LibraryApi {
  async getLibrary(): Promise<LibraryResponse> {
    const { data: response } = await http.get<LibraryResponse>('/audio_test/list_all_by_user');
    return response;
  }
}

export const libraryApi = new LibraryApi();
