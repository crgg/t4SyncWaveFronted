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
  IPayloadDeleteGroup,
  IPayloadLeaveGroup,
  IPayloadPause,
  IPayloadPlay,
  IPayloadRemoveMember,
  IPayloadUpdateGroup,
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
}

export const groupsApi = new GroupsApi();
