/**
 * Meeting API service for managing video conferences
 */

import { apiClient } from './apiClient';

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  max_participants?: number;
  settings?: {
    allow_recording?: boolean;
    allow_screen_sharing?: boolean;
    require_host_approval?: boolean;
    mute_participants_on_join?: boolean;
    disable_video_on_join?: boolean;
  };
  invitations?: Array<{
    email?: string;
    phone_number?: string;
    role?: 'participant' | 'moderator';
  }>;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  host_id: string;
  host_name: string;
  meeting_url: string;
  status: 'scheduled' | 'active' | 'ended';
  created_at: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  max_participants: number;
  participant_count: number;
  settings: {
    allow_recording: boolean;
    allow_screen_sharing: boolean;
    require_host_approval: boolean;
    mute_participants_on_join: boolean;
    disable_video_on_join: boolean;
  };
  webrtc_config: {
    ice_servers: Array<{
      urls: string[];
      username?: string;
      credential?: string;
    }>;
  };
}

export interface Participant {
  id: string;
  user_id: string;
  display_name?: string;
  user_name?: string;
  user_email?: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at?: string;
  left_at?: string;
  duration_minutes?: number;
  video_enabled: boolean;
  audio_enabled: boolean;
  screen_sharing: boolean;
  connection_quality?: string;
  status?: string;
  join_time?: string;
}

export interface MeetingListResponse {
  meetings: Meeting[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface MeetingStats {
  total_meetings_hosted: number;
  total_meetings_attended: number;
  total_meeting_time_minutes: number;
  meetings_this_week: number;
  upcoming_meetings: number;
}

export interface InvitationResponse {
  id: string;
  meeting_id: string;
  email: string;
  invitation_token: string;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface InvitationListResponse {
  invitations: InvitationResponse[];
  total: number;
}

class MeetingApiService {
  /**
   * Create a new meeting
   */
  async createMeeting(meetingData: CreateMeetingRequest): Promise<Meeting> {
    const response = await apiClient.post('/meetings/', meetingData);
    return response.data;
  }

  /**
   * Get user's meetings with pagination and filters
   */
  async getMeetings(params?: {
    status?: 'scheduled' | 'active' | 'ended';
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<MeetingListResponse> {
    const response = await apiClient.get('/meetings', { params });
    return response.data;
  }

  /**
   * Get meeting details by ID
   */
  async getMeeting(meetingId: string): Promise<Meeting> {
    const response = await apiClient.get(`/meetings/${meetingId}`);
    return response.data;
  }

  /**
   * Join a meeting
   */
  async joinMeeting(meetingId: string, joinData?: {
    display_name?: string;
    video_enabled?: boolean;
    audio_enabled?: boolean;
    passcode?: string;
  }): Promise<Meeting> {
    const defaultJoinData = {
      video_enabled: true,
      audio_enabled: true,
      ...joinData
    };
    const response = await apiClient.post(`/meetings/${meetingId}/join/`, defaultJoinData);
    return response.data;
  }

  /**
   * Leave a meeting
   */
  async leaveMeeting(meetingId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/meetings/${meetingId}/leave`);
    return response.data;
  }

  /**
   * End a meeting (host only)
   */
  async endMeeting(meetingId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/meetings/${meetingId}/end`);
    return response.data;
  }

  /**
   * Update meeting details
   */
  async updateMeeting(meetingId: string, updateData: Partial<CreateMeetingRequest>): Promise<Meeting> {
    const response = await apiClient.put(`/meetings/${meetingId}`, updateData);
    return response.data;
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/meetings/${meetingId}`);
    return response.data;
  }

  /**
   * Get meeting participants
   */
  async getMeetingParticipants(meetingId: string): Promise<Participant[]> {
    const response = await apiClient.get(`/meetings/${meetingId}/participants`);
    return response.data;
  }

  /**
   * Invite participants to meeting
   */
  async inviteParticipants(
    meetingId: string,
    invitations: Array<{
      email?: string;
      phone_number?: string;
      role?: 'participant' | 'moderator';
    }>
  ): Promise<{ message: string; sent_count: number }> {
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    const response = await apiClient.post(`/meetings/${meetingId}/invite`, {
      invitations,
      frontend_url: frontendUrl
    });
    return response.data;
  }

  /**
   * Remove participant from meeting (host/moderator only)
   */
  async removeParticipant(meetingId: string, participantId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/meetings/${meetingId}/participants/${participantId}`);
    return response.data;
  }

  /**
   * Update participant role (host only)
   */
  async updateParticipantRole(
    meetingId: string,
    participantId: string,
    role: 'moderator' | 'participant'
  ): Promise<{ message: string }> {
    const response = await apiClient.put(`/meetings/${meetingId}/participants/${participantId}`, {
      role
    });
    return response.data;
  }

  /**
   * Get upcoming meetings for dashboard
   */
  async getUpcomingMeetings(limit: number = 5): Promise<Meeting[]> {
    const response = await apiClient.get('/meetings', {
      params: {
        status: 'scheduled',
        per_page: limit,
        sort: 'scheduled_at',
        order: 'asc'
      }
    });
    return response.data.meetings;
  }

  /**
   * Get recent meetings for dashboard
   */
  async getRecentMeetings(limit: number = 5): Promise<Meeting[]> {
    const response = await apiClient.get('/meetings', {
      params: {
        status: 'ended',
        per_page: limit,
        sort: 'ended_at',
        order: 'desc'
      }
    });
    return response.data.meetings;
  }

  /**
   * Get active meetings
   */
  async getActiveMeetings(): Promise<Meeting[]> {
    const response = await apiClient.get('/meetings', {
      params: {
        status: 'active'
      }
    });
    return response.data.meetings;
  }

  /**
   * Start recording (host/moderator only)
   */
  async startRecording(meetingId: string): Promise<{ message: string; recording_id: string }> {
    const response = await apiClient.post(`/meetings/${meetingId}/recording/start`);
    return response.data;
  }

  /**
   * Stop recording (host/moderator only)
   */
  async stopRecording(meetingId: string): Promise<{ message: string; recording_url?: string }> {
    const response = await apiClient.post(`/meetings/${meetingId}/recording/stop`);
    return response.data;
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(meetingId: string): Promise<Array<{
    id: string;
    filename: string;
    duration_seconds: number;
    file_size_mb: number;
    created_at: string;
    download_url: string;
  }>> {
    const response = await apiClient.get(`/meetings/${meetingId}/recordings`);
    return response.data.recordings;
  }

  /**
   * Generate meeting link for sharing
   */
  async generateMeetingLink(meetingId: string): Promise<{ meeting_url: string; expires_at?: string }> {
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    const response = await apiClient.post(`/meetings/${meetingId}/link`, {
      frontend_url: frontendUrl
    });
    return response.data;
  }

  /**
   * Search meetings
   */
  async searchMeetings(query: string, filters?: {
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<MeetingListResponse> {
    const response = await apiClient.get('/meetings/search', {
      params: {
        q: query,
        ...filters
      }
    });
    return response.data;
  }

  /**
   * Get meeting analytics/stats
   */
  async getMeetingStats(): Promise<MeetingStats> {
    const response = await apiClient.get('/meetings/stats');
    return response.data;
  }

  /**
   * Join meeting by URL/ID (for guest users)
   */
  async joinMeetingAsGuest(meetingId: string, guestInfo: {
    name: string;
    email?: string;
  }): Promise<{
    participant_id: string;
    meeting_token: string;
    webrtc_config: {
      iceServers: Array<{
        urls: string;
        username?: string;
        credential?: string;
      }>;
    };
    websocket_url: string;
  }> {
    const response = await apiClient.post(`/meetings/${meetingId}/join-guest`, guestInfo);
    return response.data;
  }

  /**
   * Validate meeting access
   */
  async validateMeetingAccess(meetingId: string): Promise<{
    has_access: boolean;
    meeting?: Meeting;
    requires_approval?: boolean;
  }> {
    const response = await apiClient.get(`/meetings/${meetingId}/access`);
    return response.data;
  }

  /**
   * Request meeting approval (for meetings requiring host approval)
   */
  async requestMeetingApproval(meetingId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/meetings/${meetingId}/request-approval`);
    return response.data;
  }

  /**
   * Approve/deny meeting join request (host/moderator only)
   */
  async handleJoinRequest(
    meetingId: string,
    requestId: string,
    action: 'approve' | 'deny'
  ): Promise<{ message: string }> {
    const response = await apiClient.post(`/meetings/${meetingId}/join-requests/${requestId}`, {
      action
    });
    return response.data;
  }

  /**
   * Invite a participant to a meeting
   */
  async inviteParticipant(
    meetingId: string,
    email: string,
    role: string = 'participant'
  ): Promise<InvitationResponse> {
    const response = await apiClient.post(`/meetings/${meetingId}/invite`, {
      email,
      role
    });
    return response.data;
  }

  /**
   * Invite multiple participants to a meeting
   */
  async inviteMultipleParticipants(
    meetingId: string,
    emails: string[],
    role: string = 'participant',
    message?: string
  ): Promise<InvitationListResponse> {
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    const response = await apiClient.post(`/meetings/${meetingId}/invite-multiple`, {
      emails,
      role,
      message,
      frontend_url: frontendUrl
    });
    return response.data;
  }

  /**
   * Get all invitations for a meeting
   */
  async getMeetingInvitations(meetingId: string): Promise<InvitationListResponse> {
    const response = await apiClient.get(`/meetings/${meetingId}/invitations`);
    return response.data;
  }

  /**
   * Accept a meeting invitation
   */
  async acceptInvitation(invitationToken: string): Promise<{
    message: string;
    meeting_id: string;
    meeting_title: string;
    join_url: string;
    accepted_at: string;
  }> {
    const response = await apiClient.post(`/meetings/invitation/${invitationToken}/accept`);
    return response.data;
  }
}

export const meetingApi = new MeetingApiService();