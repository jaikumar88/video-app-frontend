import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  id: string;
  sender_user_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  message_type: 'text' | 'file' | 'system';
  is_private: boolean;
  recipient_user_id?: string;
  file_url?: string;
  file_name?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  unreadCount: number;
  isTyping: { [userId: string]: boolean };
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  isOpen: false,
  unreadCount: 0,
  isTyping: {},
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      if (!state.isOpen) {
        state.unreadCount += 1;
      }
    },
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
      if (state.isOpen) {
        state.unreadCount = 0;
      }
    },
    openChat: (state) => {
      state.isOpen = true;
      state.unreadCount = 0;
    },
    closeChat: (state) => {
      state.isOpen = false;
    },
    markAsRead: (state) => {
      state.unreadCount = 0;
    },
    setTyping: (state, action: PayloadAction<{ userId: string; isTyping: boolean }>) => {
      const { userId, isTyping } = action.payload;
      if (isTyping) {
        state.isTyping[userId] = true;
      } else {
        delete state.isTyping[userId];
      }
    },
    clearChat: (state) => {
      state.messages = [];
      state.isOpen = false;
      state.unreadCount = 0;
      state.isTyping = {};
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  addMessage,
  setMessages,
  toggleChat,
  openChat,
  closeChat,
  markAsRead,
  setTyping,
  clearChat,
  setError,
  setLoading,
} = chatSlice.actions;

export default chatSlice.reducer;