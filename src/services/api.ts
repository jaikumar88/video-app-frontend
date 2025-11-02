import apiClient from './apiClient';

export interface LoginCredentials {
  email?: string;
  email_or_phone?: string;
  password: string;
}

export interface RegisterData {
  email?: string;
  phone_number?: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string | null;
    phone_number: string | null;
    first_name: string;
    last_name: string;
    display_name: string | null;
    avatar_url: string | null;
    email_verified: boolean;
    phone_verified: boolean;
    is_verified: boolean;
    is_superuser: boolean;
    is_active: boolean;
    created_at: string;
  };
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  verifyEmail: async (token: string): Promise<void> => {
    await apiClient.post('/auth/verify-email', { token });
  },

  verifyPhone: async (phoneNumber: string, code: string): Promise<void> => {
    await apiClient.post('/auth/verify-phone', {
      phone_number: phoneNumber,
      verification_code: code
    });
  },

  resendVerification: async (email?: string, phoneNumber?: string): Promise<void> => {
    await apiClient.post('/auth/resend-verification', {
      email,
      phone_number: phoneNumber
    });
  },

  resetPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { email });
  },

  updateProfile: async (data: Partial<RegisterData>): Promise<AuthResponse['user']> => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<AuthResponse['user']> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
};

// Meeting API functions
export const meetingApi = {
  joinMeeting: async (meetingId: string, joinData?: {
    display_name?: string;
    video_enabled?: boolean;
    audio_enabled?: boolean;
    passcode?: string;
  }) => {
    const defaultJoinData = {
      video_enabled: true,
      audio_enabled: true,
      ...joinData
    };
    const response = await apiClient.post(`/meetings/${meetingId}/join`, defaultJoinData);
    return response.data;
  },

  leaveMeeting: async (meetingId: string) => {
    const response = await apiClient.post(`/meetings/${meetingId}/leave`);
    return response.data;
  },

  endMeeting: async (meetingId: string) => {
    const response = await apiClient.post(`/meetings/${meetingId}/end`);
    return response.data;
  },

  createMeeting: async (data: { title: string; description?: string; scheduled_time?: string }) => {
    const response = await apiClient.post('/meetings/', data);
    return response.data;
  },

  getMeeting: async (meetingId: string) => {
    const response = await apiClient.get(`/meetings/${meetingId}`);
    return response.data;
  },

  getMeetings: async () => {
    const response = await apiClient.get('/meetings');
    return response.data;
  }
};

export default authAPI;