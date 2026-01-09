import { http } from '@app/http';
import * as Types from './inbox.types';

class InboxApi {
  async getInvitations(): Promise<Types.InboxResponse> {
    const response = await http.get<Types.InboxResponse>('/invitations');
    return response.data;
  }
}

export const inboxApi = new InboxApi();
