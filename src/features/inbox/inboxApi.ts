import { http } from '@app/http';
import * as Types from './inbox.types';

class InboxApi {
  async getInvitations(): Promise<Types.InboxResponse> {
    const response = await http.get<Types.InboxResponse>('/invitations');
    return response.data;
  }
  async acceptInvitation(id: string): Promise<Types.Invitation> {
    const response = await http.post<Types.Invitation>(`/invitations/${id}/accept`);
    return response.data;
  }
  async rejectInvitation(id: string): Promise<Types.Invitation> {
    const response = await http.post<Types.Invitation>(`/invitations/${id}/reject`);
    return response.data;
  }
}

export const inboxApi = new InboxApi();
