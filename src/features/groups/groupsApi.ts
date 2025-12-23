import { http } from '@app/http';
import type {
  AddMemberToGroupResponse,
  CreateResponse,
  FormAddMemberToGroup,
  FormCreateGroup,
  GroupResponse,
  GroupsResponse,
  IPayloadDeleteGroup,
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
  async createGroup(data: FormCreateGroup): Promise<CreateResponse> {
    const response = await http.post<CreateResponse>('/groups/create', data);
    return response.data;
  }
  async getGroupById(groupId: string): Promise<GroupResponse> {
    const response = await http.get<GroupResponse>(`/groups/get/${groupId}`);
    return response.data;
  }
  async addMemberToGroup(data: FormAddMemberToGroup): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/add-member', data);
    return response.data;
  }
  async removeMemberFromGroup(data: IPayloadRemoveMember): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/remove-member', data);
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
}

export const groupsApi = new GroupsApi();
