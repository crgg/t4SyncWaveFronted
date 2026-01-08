import { http } from '@app/http';

export interface UploadResponse {
  ok: boolean;
  id: string;
  title: string;
  duration: number;
  url: string;
}

export interface IAudioUploadResponse extends ResponseBase {
  track: IAudioUpload;
}

export interface IAudioUpload {
  id: string;
  title: string;
  artist: string;
  file_url: string;
  duration_ms: number;
}

export const uploadService = {
  uploadAudio: async (file: File, groupId: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId);

    const response = await http.post<UploadResponse>('/audio_test/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
  uploadAudioToLibrary: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await http.post<UploadResponse>('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
  addTrackToGroup: async (trackId: string, groupId: string): Promise<IAudioUploadResponse> => {
    const response = await http.post<IAudioUploadResponse>(`/audio/add-track-to-group`, {
      trackId,
      groupId,
    });
    return response.data;
  },
};
