/**
 * WebSocket Service for real-time communication with the server
 */

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface ChatMessage {
  from_user: string;
  message: string;
  timestamp: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private meetingId: string | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Event handlers
  public onMessage?: (message: WebSocketMessage) => void;
  public onParticipantJoined?: (participantId: string) => void;
  public onParticipantLeft?: (participantId: string) => void;
  public onMeetingEnded?: () => void;
  public onChatMessage?: (message: ChatMessage) => void;
  public onWebRTCSignal?: (message: any) => void;
  public onParticipantMediaChange?: (participantId: string, changes: any) => void;
  public onConnectionStateChange?: (connected: boolean) => void;
  
  /**
   * Connect to WebSocket server
   */
  async connect(meetingId: string, token: string): Promise<void> {
    this.meetingId = meetingId;
    this.token = token;
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl(meetingId, token);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected to meeting:', meetingId);
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(true);
          }
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.stopHeartbeat();
          
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange(false);
          }
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.shouldReconnect()) {
            this.attemptReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Build WebSocket URL with parameters
   */
  private buildWebSocketUrl(meetingId: string, token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_URL || `${protocol}//${window.location.host}`;
    return `${host}/ws/${meetingId}?token=${encodeURIComponent(token)}`;
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      // Call generic message handler
      if (this.onMessage) {
        this.onMessage(message);
      }
      
      // Handle specific message types
      switch (message.type) {
        case 'meeting_joined':
          console.log('Successfully joined meeting');
          break;
          
        case 'user_joined':
          console.log('User joined:', message.user_id);
          if (this.onParticipantJoined) {
            this.onParticipantJoined(message.user_id);
          }
          break;
          
        case 'user_left':
          console.log('User left:', message.user_id);
          if (this.onParticipantLeft) {
            this.onParticipantLeft(message.user_id);
          }
          break;
          
        case 'meeting_started':
          console.log('Meeting started');
          break;
          
        case 'meeting_ended':
          console.log('Meeting ended');
          if (this.onMeetingEnded) {
            this.onMeetingEnded();
          }
          break;
          
        case 'chat_message':
          console.log('Chat message received:', message);
          if (this.onChatMessage) {
            this.onChatMessage({
              from_user: message.from_user,
              message: message.message,
              timestamp: message.timestamp
            });
          }
          break;
          
        case 'webrtc_signal':
          console.log('WebRTC signal received:', message);
          if (this.onWebRTCSignal) {
            this.onWebRTCSignal(message);
          }
          break;
          
        case 'participant_media_change':
          console.log('Participant media change:', message);
          if (this.onParticipantMediaChange) {
            this.onParticipantMediaChange(message.user_id, {
              videoEnabled: message.video_enabled,
              audioEnabled: message.audio_enabled,
              screenSharing: message.screen_sharing
            });
          }
          break;
          
        case 'pong':
          // Heartbeat response
          break;
          
        case 'error':
          console.error('Server error:', message.message);
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  /**
   * Send a message to the server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  /**
   * Send a custom message to the server
   */
  sendMessage(message: WebSocketMessage): void {
    this.send(message);
  }

  /**
   * Send WebRTC signaling message
   */
  sendWebRTCSignal(data: any): void {
    this.send(data);
  }
  
  /**
   * Send chat message
   */
  sendChatMessage(message: string): void {
    this.send({
      type: 'chat_message',
      message: message
    });
  }
  
  /**
   * Send media state change notification
   */
  sendMediaStateChange(state: {
    video_enabled: boolean;
    audio_enabled: boolean;
    screen_sharing: boolean;
  }): void {
    this.send({
      type: 'media_state_change',
      ...state
    });
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000); // Send ping every 30 seconds
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Check if we should attempt to reconnect
   */
  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }
  
  /**
   * Attempt to reconnect to WebSocket
   */
  private async attemptReconnect(): Promise<void> {
    if (!this.shouldReconnect() || !this.meetingId || !this.token) {
      console.log('Max reconnection attempts reached or missing connection info');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Wait before reconnecting (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
    
    try {
      await this.connect(this.meetingId, this.token);
      console.log('Successfully reconnected');
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.attemptReconnect(); // Try again
    }
  }
  
  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.meetingId = null;
    this.token = null;
    this.reconnectAttempts = 0;
    
    console.log('WebSocket disconnected');
  }
  
  /**
   * Get connection state
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  /**
   * Get connection ready state
   */
  getReadyState(): number | null {
    return this.ws?.readyState ?? null;
  }
}