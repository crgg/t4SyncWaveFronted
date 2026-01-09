import type { Invitation } from '../inbox/inbox.types';

export interface Group {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  current_track_id?: any;
  current_time_ms: number;
  is_playing: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  created_by_avatar_url?: any;
  members?: Member[];
  current_track: Array<any> | ICurrentTrack;
}

export interface ICurrentTrack {
  id: string;
  group_id: string;
  track_id: string;
  position: number;
  added_by: string;
  created_at: string;
  title: string;
  artist: string;
  file_url: string;
  duration_ms: number;
  uploaded_by: string;
}

export interface GroupsResponse extends ResponseBase {
  groups: Group[];
}

export interface CreateResponse extends ResponseBase {
  group: Omit<Group, 'created_by_name' | 'created_by_avatar_url'>;
  member: PartialMember[];
}

type PartialMember = Omit<Member, 'name' | 'email' | 'avatar_url'>;

export interface Member {
  id: string;
  group_id: string;
  user_id: string;
  guest_name?: any;
  role: string;
  joined_at: string;
  name: string;
  email: string;
  avatar_url?: any;
  display_name?: string;
}

export interface GroupResponse extends ResponseBase {
  group: Group;
}

export interface FormCreateGroup {
  name: string;
}

export interface FormAddMemberToGroup {
  groupId: string;
  email?: string;
  phone?: string;
  code?: string;
  role: string; // dj or member
}

export interface User {
  id: string;
  username?: any;
  name: string;
  password: string;
  email: string;
  avatar_url?: any;
  created_at: string;
  updated_at: string;
}

export interface MemberStored {
  id: string;
  group_id: string;
  user_id: string;
  guest_name?: any;
  role: string;
  joined_at: string;
  user: User;
  group: Group;
}

export interface AddMemberToGroupResponse extends ResponseBase {
  member: MemberStored;
  error?: string;
}

export interface GroupPlaybackStateResponse extends ResponseBase {
  message?: string;
  msg?: string;
  playbackState?: IGroupPlaybackState | null;
}

export interface IGroupPlaybackState {
  isPlaying: boolean;
  trackId: string;
  trackUrl?: string;
  trackTitle?: string | null;
  trackArtist?: string | null;
  duration?: number | null;
  startedAt: number;
  lastEvent: string;
  lastEventTime: number;
  position: number | null;
  userId: string | null;
  userName: string | null;
  clientsCount: number;
}

export interface IPayloadUpdateGroup {
  id: string;
  name: string;
}

export interface IPayloadDeleteGroup {
  id: string;
}

export interface IPayloadRemoveMember {
  groupId: string;
  memberId: string;
}

export interface IPayloadLeaveGroup {
  groupId: string;
}

export type GroupState = 'IDLE' | 'PLAYING_HOSTED' | 'PLAYING_NO_HOST' | 'CONTROL_AVAILABLE';

export interface GroupStateResponse {
  status: boolean;
  state?: {
    state: GroupState;
    host_id: string | null;
    control_locked: boolean;
    last_dj_active: string;
  };
  msg?: string;
}

export interface IRoomUser {
  odooUserId: string;
  odooName: string;
  peerId: string;
  userName: string;
  role: string;
  isHost: boolean;
  joinedAt: string;
}

export interface IRoomUsers {
  type: string;
  room: string;
  users: IRoomUser[];
  count: number;
}

// Play / Pause Payload
export interface IPayloadPlay {
  groupId: string;
  trackId: string;
  startedAt: number;
}

export interface IPayloadPause {
  groupId: string;
}

export type DialogType = 'leave-group' | null;

export type IPayloadDjConnecDisconnect = {
  groupId: string;
  hasTrack: boolean;
  isPlaying: boolean;
};

export interface IGroupUsers {
  dj: Member | null;
  members: Member[];
}

export interface IPayloadAddMemberToGroupByPhone {
  groupId: string;
  inviteePhone: string;
}

export interface IResponseInvitation extends ResponseBase {
  msg: string;
  invitation: Invitation;
}
