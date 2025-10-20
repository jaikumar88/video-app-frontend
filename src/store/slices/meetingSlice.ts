import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Meeting {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  host_user_id: string;
  start_time: string;
  end_time?: string;
  status: 'scheduled' | 'active' | 'ended';
  max_participants: number;
  current_participants: number;
  is_recording: boolean;
  settings: {
    video_enabled: boolean;
    audio_enabled: boolean;
    screen_sharing_enabled: boolean;
    chat_enabled: boolean;
    waiting_room_enabled: boolean;
  };
}

export interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  role: 'host' | 'moderator' | 'participant';
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  is_screen_sharing: boolean;
  joined_at: string;
}

interface MeetingState {
  currentMeeting: Meeting | null;
  participants: Participant[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  localVideo: boolean;
  localAudio: boolean;
  isScreenSharing: boolean;
}

const initialState: MeetingState = {
  currentMeeting: null,
  participants: [],
  isConnected: false,
  loading: false,
  error: null,
  localVideo: true,
  localAudio: true,
  isScreenSharing: false,
};

// Async thunks
export const joinMeeting = createAsyncThunk(
  'meeting/join',
  async ({ meetingId, displayName }: { meetingId: string; displayName: string }) => {
    // TODO: Implement actual API call
    console.log('Joining meeting:', meetingId, displayName);
    return { meetingId, displayName };
  }
);

export const leaveMeeting = createAsyncThunk(
  'meeting/leave',
  async () => {
    // TODO: Implement actual API call
    console.log('Leaving meeting');
    return true;
  }
);

export const createMeeting = createAsyncThunk(
  'meeting/create',
  async (meetingData: Partial<Meeting>) => {
    // TODO: Implement actual API call
    console.log('Creating meeting:', meetingData);
    return meetingData;
  }
);

const meetingSlice = createSlice({
  name: 'meeting',
  initialState,
  reducers: {
    setCurrentMeeting: (state, action: PayloadAction<Meeting>) => {
      state.currentMeeting = action.payload;
    },
    addParticipant: (state, action: PayloadAction<Participant>) => {
      state.participants.push(action.payload);
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter(p => p.id !== action.payload);
    },
    updateParticipant: (state, action: PayloadAction<{ id: string; updates: Partial<Participant> }>) => {
      const { id, updates } = action.payload;
      const participant = state.participants.find(p => p.id === id);
      if (participant) {
        Object.assign(participant, updates);
      }
    },
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    toggleLocalVideo: (state) => {
      state.localVideo = !state.localVideo;
    },
    toggleLocalAudio: (state) => {
      state.localAudio = !state.localAudio;
    },
    setScreenSharing: (state, action: PayloadAction<boolean>) => {
      state.isScreenSharing = action.payload;
    },
    clearMeeting: (state) => {
      state.currentMeeting = null;
      state.participants = [];
      state.isConnected = false;
      state.isScreenSharing = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(joinMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.isConnected = true;
      })
      .addCase(joinMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to join meeting';
      })
      .addCase(leaveMeeting.fulfilled, (state) => {
        state.currentMeeting = null;
        state.participants = [];
        state.isConnected = false;
        state.isScreenSharing = false;
      })
      .addCase(createMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMeeting.fulfilled, (state, action) => {
        state.loading = false;
        // TODO: Handle created meeting response
      })
      .addCase(createMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create meeting';
      });
  },
});

export const {
  setCurrentMeeting,
  addParticipant,
  removeParticipant,
  updateParticipant,
  setConnectionStatus,
  toggleLocalVideo,
  toggleLocalAudio,
  setScreenSharing,
  clearMeeting,
  setError,
} = meetingSlice.actions;

export default meetingSlice.reducer;