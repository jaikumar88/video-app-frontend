/**
 * WebRTC Service for handling peer-to-peer video and audio connections
 */

import { WebSocketService } from './WebSocketService';

export interface RTCConfiguration {
  iceServers: RTCIceServer[];
}

export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private websocketService: WebSocketService;
  private configuration: RTCConfiguration;
  
  // Event handlers
  public onRemoteStream?: (participantId: string, stream: MediaStream) => void;
  public onParticipantMediaChange?: (participantId: string, changes: any) => void;
  public onConnectionStateChange?: (participantId: string, state: string) => void;
  
  constructor(websocketService: WebSocketService) {
    this.websocketService = websocketService;
    
    // STUN/TURN server configuration
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Add TURN servers for production
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'your-username',
        //   credential: 'your-credential'
        // }
      ]
    };
  }
  
  /**
   * Initialize WebRTC service and get user media
   */
  async initialize(): Promise<void> {
    try {
      // Set up WebSocket message handlers for WebRTC signaling
      this.websocketService.onWebRTCSignal = this.handleWebRTCSignal.bind(this);
      
      console.log('WebRTC service initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      throw error;
    }
  }
  
  /**
   * Get local media stream (video and audio)
   */
  async getLocalStream(
    videoEnabled: boolean = true,
    audioEnabled: boolean = true
  ): Promise<MediaStream | null> {
    try {
      const constraints: MediaConstraints = {
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Local stream obtained:', this.localStream);
      
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }
  
  /**
   * Get screen share stream
   */
  async getScreenShareStream(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      console.log('Screen share stream obtained:', screenStream);
      return screenStream;
    } catch (error) {
      console.error('Error getting screen share stream:', error);
      throw error;
    }
  }
  
  /**
   * Create peer connection for a participant
   */
  async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(this.configuration);
    
    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Remote stream received from:', participantId);
      const [remoteStream] = event.streams;
      
      if (this.onRemoteStream && remoteStream) {
        this.onRemoteStream(participantId, remoteStream);
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', participantId);
        this.websocketService.sendWebRTCSignal({
          type: 'webrtc_ice_candidate',
          to_user: participantId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, peerConnection.connectionState);
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(participantId, peerConnection.connectionState);
      }
      
      // Clean up closed connections
      if (peerConnection.connectionState === 'closed' || 
          peerConnection.connectionState === 'failed') {
        this.removePeerConnection(participantId);
      }
    };
    
    this.peerConnections.set(participantId, peerConnection);
    console.log('Peer connection created for:', participantId);
    
    return peerConnection;
  }
  
  /**
   * Create and send WebRTC offer
   */
  async createOffer(participantId: string): Promise<void> {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) {
      console.error('No peer connection found for:', participantId);
      return;
    }
    
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.setLocalDescription(offer);
      
      console.log('Sending WebRTC offer to:', participantId);
      this.websocketService.sendWebRTCSignal({
        type: 'webrtc_offer',
        to_user: participantId,
        sdp: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }
  
  /**
   * Handle WebRTC signaling messages
   */
  private async handleWebRTCSignal(message: any): Promise<void> {
    const { from_user, signal_data } = message;
    
    try {
      switch (signal_data.type) {
        case 'offer':
          await this.handleOffer(from_user, signal_data.sdp);
          break;
        case 'answer':
          await this.handleAnswer(from_user, signal_data.sdp);
          break;
        case 'ice_candidate':
          await this.handleIceCandidate(from_user, signal_data.candidate);
          break;
        default:
          console.warn('Unknown WebRTC signal type:', signal_data.type);
      }
    } catch (error) {
      console.error('Error handling WebRTC signal:', error);
    }
  }
  
  /**
   * Handle WebRTC offer
   */
  private async handleOffer(participantId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    console.log('Received WebRTC offer from:', participantId);
    
    let peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) {
      peerConnection = await this.createPeerConnection(participantId);
    }
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    console.log('Sending WebRTC answer to:', participantId);
    this.websocketService.sendWebRTCSignal({
      type: 'webrtc_answer',
      to_user: participantId,
      sdp: answer
    });
  }
  
  /**
   * Handle WebRTC answer
   */
  private async handleAnswer(participantId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    console.log('Received WebRTC answer from:', participantId);
    
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }
  
  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(participantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    console.log('Received ICE candidate from:', participantId);
    
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }
  
  /**
   * Toggle video on/off
   */
  async toggleVideo(enabled: boolean): Promise<void> {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = enabled;
      });
      
      console.log('Video toggled:', enabled);
    }
  }
  
  /**
   * Toggle audio on/off
   */
  async toggleAudio(enabled: boolean): Promise<void> {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
      
      console.log('Audio toggled:', enabled);
    }
  }
  
  /**
   * Toggle screen sharing
   */
  async toggleScreenShare(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // Start screen sharing
        const screenStream = await this.getScreenShareStream();
        if (screenStream) {
          const videoTrack = screenStream.getVideoTracks()[0];
          
          // Replace video track in all peer connections
          this.peerConnections.forEach(async (peerConnection, participantId) => {
            const sender = peerConnection.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            
            if (sender) {
              await sender.replaceTrack(videoTrack);
            }
          });
          
          // Handle screen share end
          videoTrack.onended = () => {
            console.log('Screen sharing ended');
            this.stopScreenShare();
          };
          
          console.log('Screen sharing started');
        }
      } else {
        // Stop screen sharing
        await this.stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      throw error;
    }
  }
  
  /**
   * Stop screen sharing and return to camera
   */
  private async stopScreenShare(): Promise<void> {
    try {
      // Get camera stream again
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      const videoTrack = cameraStream.getVideoTracks()[0];
      
      // Replace screen share with camera in all peer connections
      this.peerConnections.forEach(async (peerConnection, participantId) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      });
      
      // Update local stream
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        this.localStream.addTrack(videoTrack);
      }
      
      console.log('Screen sharing stopped, returned to camera');
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }
  
  /**
   * Remove peer connection
   */
  removePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
      console.log('Peer connection removed for:', participantId);
    }
  }
  
  /**
   * Disconnect and cleanup all connections
   */
  disconnect(): void {
    // Close all peer connections
    this.peerConnections.forEach((peerConnection, participantId) => {
      peerConnection.close();
    });
    this.peerConnections.clear();
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    console.log('WebRTC service disconnected');
  }
  
  /**
   * Get connection stats for monitoring
   */
  async getConnectionStats(participantId: string): Promise<RTCStatsReport | null> {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      return await peerConnection.getStats();
    }
    return null;
  }
}