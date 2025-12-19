import { http } from '@app/http';
import type {
  AddMemberToGroupResponse,
  CreateResponse,
  FormAddMemberToGroup,
  FormCreateGroup,
  GroupByIdResponse,
  GroupsResponse,
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
  async getGroupById(groupId: string): Promise<GroupByIdResponse> {
    const response = await http.get<GroupByIdResponse>(`/groups/get/${groupId}`);
    return response.data;
  }
  async addMemberToGroup(data: FormAddMemberToGroup): Promise<AddMemberToGroupResponse> {
    const response = await http.post<AddMemberToGroupResponse>('/groups/add-member', data);
    return response.data;
  }
}

export const groupsApi = new GroupsApi();
