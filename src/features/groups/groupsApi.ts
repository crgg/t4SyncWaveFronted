import { http } from '@app/http';
import type {
  AddMemberToGroupResponse,
  CreateResponse,
  FormAddMemberToGroup,
  FormCreateGroup,
  GroupPlaybackStateResponse,
  GroupResponse,
  GroupsResponse,
  GroupStateResponse,
  // IInvitationResponse,
  IPayloadDeleteGroup,
  IPayloadDjConnecDisconnect,
  IPayloadLeaveGroup,
  IPayloadPause,
  IPayloadPlay,
  IPayloadRemoveMember,
  IPayloadUpdateGroup,
  IPayloadAddMemberToGroupByPhone,
  IResponseInvitation,
  MediaSessionJoinResponse,
  MediaSessionStartResponse,
  MediaSessionStatusResponse,
  MediaSessionType,
} from './groups.types';

class GroupsApi {
  async getGroups(): Promise<GroupsResponse> {
    const response = await http.get<GroupsResponse>('/groups/list');
    return response.data;
  }
  async getOthersGroups(): Promise<GroupsResponse> {
    const response = await http.get<GroupsResponse>(`/groups/groups-listens`);
    return response.data;
  }
  async getGroupPlaybackState(groupId: string): Promise<GroupPlaybackStateResponse> {
    const uri = `/groups/${groupId}/playback-state`;
    const response = await http.get<GroupPlaybackStateResponse>(uri);
    return response.data;
  }
  async createGroup(data: FormCreateGroup): Promise<CreateResponse> {
    const response = await http.post<CreateResponse>('/groups/create', data);
    return response.data;
  }
  async getGroupById(groupId: string): Promise<GroupResponse> {
    const response = await http.get<GroupResponse>(`/groups/get/${groupId}`);
    if (!response.data?.status) {
      throw new Error(response.data?.error || 'Failed to get group');
    }
    return response.data;
  }
  async addMemberToGroup(data: FormAddMemberToGroup): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/add-member', data);
    return response.data;
  }
  async addMemberToGroupByPhone(
    data: IPayloadAddMemberToGroupByPhone
  ): Promise<IResponseInvitation> {
    const response = await http.post<IResponseInvitation>(
      `/groups/${data.groupId}/invitations`,
      data
    );
    return response.data;
  }
  async removeMemberFromGroup(data: IPayloadRemoveMember): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/remove-member', data);
    if (!response?.data?.status) {
      throw new Error(response?.data?.error || 'Failed to remove member');
    }
    return response.data;
  }
  async addMemberToGroupByCode(data: FormAddMemberToGroup): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/join', data);
    return response.data;
  }
  async updateGroup(data: IPayloadUpdateGroup): Promise<GroupResponse> {
    const response = await http.post<GroupResponse>('/groups/update', data);
    return response.data;
  }
  async deleteGroup(data: IPayloadDeleteGroup): Promise<GroupResponse> {
    const response = await http.post<GroupResponse>('/groups/delete', data);
    return response.data;
  }
  async leaveGroup(data: IPayloadLeaveGroup): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/leave-group', data);
    if (!response?.data?.status) {
      throw new Error(response?.data?.error || 'Failed to leave group');
    }
    return response.data;
  }
  async djDisconnect(data: {
    groupId: string;
    hasTrack: boolean;
    isPlaying: boolean;
  }): Promise<void> {
    await http.post('/groups/dj-disconnect', data);
  }
  async getGroupState(groupId: string): Promise<GroupStateResponse> {
    const response = await http.get<GroupStateResponse>(`/groups/state/${groupId}`);
    return response.data;
  }
  async play(payload: IPayloadPlay): Promise<GroupPlaybackStateResponse> {
    const response = await http.post<GroupPlaybackStateResponse>(`/groups/playback/play`, payload);
    return response.data;
  }
  async pause(payload: IPayloadPause): Promise<GroupPlaybackStateResponse> {
    const response = await http.post<GroupPlaybackStateResponse>(`/groups/playback/pause`, payload);
    return response.data;
  }
  async djToggleConnect(
    payload: IPayloadDjConnecDisconnect,
    type: 'connect' | 'disconnect' = 'connect'
  ): Promise<any> {
    const resp = await http.post<GroupPlaybackStateResponse>(`/groups/dj-${type}`, payload);
    return resp.data;
  }
  async validateControl(groupId: string): Promise<GroupStateResponse> {
    const response = await http.post<GroupStateResponse>(`/groups/validate-control`, { groupId });
    return response.data;
  }

  // Media Sessions (LiveKit)
  async startMediaSession(
    groupId: string,
    type: MediaSessionType
  ): Promise<MediaSessionStartResponse> {
    const response = await http.post<MediaSessionStartResponse>(`/groups/${groupId}/media/start`, {
      type,
    });
    return response.data;
  }

  async joinMediaSession(
    groupId: string,
    options?: { displayName?: string }
  ): Promise<MediaSessionJoinResponse> {
    const response = await http.post<MediaSessionJoinResponse>(
      `/groups/${groupId}/media/join`,
      options
    );
    return response.data;
  }

  async endMediaSession(groupId: string): Promise<{ status: boolean; msg?: string }> {
    const response = await http.post(`/groups/${groupId}/media/end`);
    return response.data;
  }

  async leaveMediaSession(groupId: string): Promise<{ status: boolean; msg?: string }> {
    const response = await http.post(`/groups/${groupId}/media/leave`);
    return response.data;
  }

  async getMediaSessionStatus(groupId: string): Promise<MediaSessionStatusResponse> {
    const response = await http.get<MediaSessionStatusResponse>(`/groups/${groupId}/media/status`);
    return response.data;
  }
}

export const groupsApi = new GroupsApi();
