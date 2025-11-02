import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  Slider,
  Stack,
} from "@mui/material";
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
  CallEnd,
  Chat,
  People,
  Settings,
  Link as LinkIcon,
  ContentCopy,
  VolumeUp,
  VolumeOff,
  VolumeMute,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { WebRTCService } from "../services/WebRTCService";
import { WebSocketService } from "../services/WebSocketService";
import { meetingApi, Meeting } from "../services/meetingApi";

interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isHost: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
}

interface FullMeetingRoomProps {
  invitationToken?: string | null;
}

const FullMeetingRoom: React.FC<FullMeetingRoomProps> = ({
  invitationToken,
}) => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const { user, accessToken } = useSelector((state: RootState) => state.auth);

  // Computed values for user display
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : "";
  const userAvatar = user?.avatar_url || "";

  // State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const [volumeMenuAnchor, setVolumeMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement | null }>(
    {}
  );
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const websocketServiceRef = useRef<WebSocketService | null>(null);

  // Initialize WebRTC and WebSocket services
  useEffect(() => {
    if (!meetingId || !user) return;

    const initializeServices = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors

        // Step 1: Join meeting first to create participant record
        console.log(
          `[FullMeetingRoom] Starting initialization for meeting: ${meetingId}`
        );
        console.log(`[FullMeetingRoom] User:`, user);
        console.log(
          `[FullMeetingRoom] Access Token:`,
          accessToken ? "Present" : "Missing"
        );

        console.log(`[FullMeetingRoom] Step 1: Joining meeting: ${meetingId}`);
        const meetingInfo = await meetingApi.joinMeeting(meetingId);
        console.log(
          `[FullMeetingRoom] Successfully joined meeting:`,
          meetingInfo
        );
        setMeeting(meetingInfo);

        // Step 2: Initialize WebSocket connection (requires participant record to exist)
        console.log(`[FullMeetingRoom] Step 2: Initializing WebSocket`);
        const wsService = new WebSocketService();
        const token = accessToken || localStorage.getItem("accessToken");
        if (!token) {
          throw new Error("No authentication token available");
        }
        console.log(
          `[FullMeetingRoom] Connecting to WebSocket for meeting: ${meetingId}`
        );
        await wsService.connect(meetingId, token);
        console.log(`[FullMeetingRoom] WebSocket connected successfully`);
        websocketServiceRef.current = wsService;

        // Step 3: Initialize WebRTC service
        console.log(`[FullMeetingRoom] Step 3: Initializing WebRTC`);
        const webrtcService = new WebRTCService(wsService);
        await webrtcService.initialize();
        console.log(`[FullMeetingRoom] WebRTC initialized`);
        webrtcServiceRef.current = webrtcService;

        // Set up local video stream
        console.log(`[FullMeetingRoom] Step 4: Getting local media stream`);
        const localStream = await webrtcService.getLocalStream(
          localVideoEnabled,
          localAudioEnabled
        );
        console.log(
          `[FullMeetingRoom] Local stream obtained:`,
          localStream ? "Success" : "Failed"
        );

        if (localStream) {
          console.log("[FullMeetingRoom] Local stream tracks:", {
            video: localStream.getVideoTracks().map((t) => ({
              id: t.id,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState,
            })),
            audio: localStream.getAudioTracks().map((t) => ({
              id: t.id,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState,
            })),
          });
        }

        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
          // Force play the video element
          try {
            await localVideoRef.current.play();
            console.log("[FullMeetingRoom] Local video playing successfully");
          } catch (playErr) {
            console.error(
              "[FullMeetingRoom] Error playing local video:",
              playErr
            );
          }
        }

        // Set up WebSocket event handlers
        wsService.onMessage = handleWebSocketMessage;
        wsService.onParticipantJoined = handleParticipantJoined;
        wsService.onParticipantLeft = handleParticipantLeft;
        wsService.onMeetingEnded = handleMeetingEnded;

        // Set up WebRTC event handlers
        webrtcService.onRemoteStream = handleRemoteStream;
        webrtcService.onParticipantMediaChange = handleParticipantMediaChange;

        // Step 5: Fetch current participants in the meeting
        console.log(`[FullMeetingRoom] Step 5: Fetching current participants`);
        const participants = await meetingApi.getMeetingParticipants(meetingId);
        console.log(`[FullMeetingRoom] Current participants:`, participants);

        // Filter out current user from participants list (show only remote participants)
        const remoteParticipants = Array.isArray(participants)
          ? participants.filter((p: any) => p.user_id !== user?.id)
          : [];
        setParticipants(
          remoteParticipants.map((p: any) => ({
            id: p.user_id,
            name: p.display_name || p.user_name || p.user_email || "Unknown",
            email: p.user_email || "",
            isHost: p.role === "host",
            videoEnabled: p.video_enabled,
            audioEnabled: p.audio_enabled,
            screenSharing: p.screen_sharing || false,
          }))
        );

        // Create peer connections for existing participants
        // Note: We don't send offers here - the existing participants will send offers to us
        // when they receive our "participant_joined" WebSocket event
        for (const participant of remoteParticipants) {
          console.log(
            `[FullMeetingRoom] Creating peer connection for existing participant:`,
            participant.user_id
          );
          await webrtcService.createPeerConnection(participant.user_id);
          console.log(
            `[FullMeetingRoom] Waiting for offer from existing participant:`,
            participant.user_id
          );
        }

        console.log(
          `[FullMeetingRoom] ✅ All services initialized successfully!`
        );
        setLoading(false);
      } catch (err: any) {
        console.error("[FullMeetingRoom] Failed to initialize meeting:", err);
        console.error("[FullMeetingRoom] Error details:", {
          name: err?.name,
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
        });

        let errorMessage = "Failed to join meeting. Please try again.";

        // Handle media device errors
        if (err?.name === "NotReadableError") {
          errorMessage =
            "Camera/microphone is already in use by another application or browser tab. Please close other tabs using the camera and refresh this page.";
        } else if (err?.name === "NotAllowedError") {
          errorMessage =
            "Camera/microphone access denied. Please allow camera and microphone permissions in your browser settings and refresh.";
        } else if (err?.name === "NotFoundError") {
          errorMessage =
            "No camera or microphone found. Please connect a camera/microphone and refresh.";
        } else if (err?.name === "AbortError") {
          errorMessage =
            "Camera/microphone access was aborted. Please try again.";
        } else if (err?.name === "OverconstrainedError") {
          errorMessage =
            "Camera/microphone does not support the required settings. Please try with a different device.";
        } else if (err?.response?.status === 404) {
          errorMessage = "Meeting not found. Please check the meeting ID.";
        } else if (err?.response?.status === 401) {
          errorMessage = "Invalid meeting passcode or unauthorized access.";
        } else if (err?.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        }

        setError(errorMessage);
        setLoading(false);
      }
    };

    initializeServices();

    return () => {
      // Cleanup
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.disconnect();
      }
      if (websocketServiceRef.current) {
        websocketServiceRef.current.disconnect();
      }
    };
  }, [meetingId, user]);

  // WebSocket message handlers
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log("WebSocket message:", message);
    // Handle different message types
  }, []);

  const handleParticipantJoined = useCallback(
    async (participantId: string) => {
      console.log("Participant joined:", participantId);

      if (!meetingId) {
        console.error("Cannot fetch participants: meetingId is undefined");
        return;
      }

      // Fetch updated participant list to get the new participant's info
      try {
        const participants = await meetingApi.getMeetingParticipants(meetingId);
        const newParticipant = Array.isArray(participants)
          ? participants.find((p: any) => p.user_id === participantId)
          : null;

        if (newParticipant && newParticipant.user_id !== user?.id) {
          // Add participant to list
          setParticipants((prev) => {
            // Check if participant already exists
            if (prev.some((p) => p.id === participantId)) {
              return prev;
            }
            return [
              ...prev,
              {
                id: newParticipant.user_id,
                name:
                  newParticipant.display_name ||
                  newParticipant.user_name ||
                  newParticipant.user_email ||
                  "Unknown",
                email: newParticipant.user_email || "",
                isHost: newParticipant.role === "host",
                videoEnabled: newParticipant.video_enabled,
                audioEnabled: newParticipant.audio_enabled,
                screenSharing: newParticipant.screen_sharing || false,
              },
            ];
          });

          // Initiate WebRTC connection with the new participant
          if (webrtcServiceRef.current) {
            console.log(
              `[FullMeetingRoom] Creating peer connection for: ${participantId}`
            );
            await webrtcServiceRef.current.createPeerConnection(participantId);

            // Create and send offer to initiate the connection
            console.log(
              `[FullMeetingRoom] Sending WebRTC offer to: ${participantId}`
            );
            await webrtcServiceRef.current.createOffer(participantId);
          }
        }
      } catch (error) {
        console.error("Failed to fetch participant info:", error);
      }
    },
    [meetingId, user]
  );

  const handleParticipantLeft = useCallback((participantId: string) => {
    console.log("Participant left:", participantId);
    // Remove participant and close connection
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.removePeerConnection(participantId);
    }
  }, []);

  const handleMeetingEnded = useCallback(() => {
    // Meeting ended by host
    navigate("/dashboard");
  }, [navigate]);

  // WebRTC event handlers
  const handleRemoteStream = useCallback(
    async (participantId: string, stream: MediaStream) => {
      console.log(
        `[FullMeetingRoom] Received remote stream for participant: ${participantId}`
      );
      const videoElement = remoteVideosRef.current[participantId];
      if (videoElement) {
        videoElement.srcObject = stream;
        // Force play the video element
        try {
          await videoElement.play();
          console.log(
            `[FullMeetingRoom] Remote video playing for: ${participantId}`
          );
        } catch (playErr) {
          console.error(
            `[FullMeetingRoom] Error playing remote video for ${participantId}:`,
            playErr
          );
        }
      } else {
        console.warn(
          `[FullMeetingRoom] Video element not found for participant: ${participantId}`
        );
      }
    },
    []
  );

  const handleParticipantMediaChange = useCallback(
    (participantId: string, changes: any) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, ...changes } : p))
      );
    },
    []
  );

  // Media control functions
  const toggleVideo = useCallback(async () => {
    if (webrtcServiceRef.current) {
      const newState = !localVideoEnabled;
      await webrtcServiceRef.current.toggleVideo(newState);
      setLocalVideoEnabled(newState);

      // Notify other participants
      if (websocketServiceRef.current) {
        websocketServiceRef.current.sendMediaStateChange({
          video_enabled: newState,
          audio_enabled: localAudioEnabled,
          screen_sharing: screenSharing,
        });
      }
    }
  }, [localVideoEnabled, localAudioEnabled, screenSharing]);

  const toggleAudio = useCallback(async () => {
    if (webrtcServiceRef.current) {
      const newState = !localAudioEnabled;
      await webrtcServiceRef.current.toggleAudio(newState);
      setLocalAudioEnabled(newState);

      // Notify other participants
      if (websocketServiceRef.current) {
        websocketServiceRef.current.sendMediaStateChange({
          video_enabled: localVideoEnabled,
          audio_enabled: newState,
          screen_sharing: screenSharing,
        });
      }
    }
  }, [localVideoEnabled, localAudioEnabled, screenSharing]);

  const toggleScreenShare = useCallback(async () => {
    if (webrtcServiceRef.current) {
      const newState = !screenSharing;
      await webrtcServiceRef.current.toggleScreenShare(newState);
      setScreenSharing(newState);

      // Notify other participants
      if (websocketServiceRef.current) {
        websocketServiceRef.current.sendMediaStateChange({
          video_enabled: localVideoEnabled,
          audio_enabled: localAudioEnabled,
          screen_sharing: newState,
        });
      }
    }
  }, [localVideoEnabled, localAudioEnabled, screenSharing]);

  const leaveMeeting = useCallback(async () => {
    try {
      if (meetingId) {
        await meetingApi.leaveMeeting(meetingId);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("Error leaving meeting:", err);
      navigate("/dashboard");
    }
  }, [meetingId, navigate]);

  const endMeeting = useCallback(async () => {
    try {
      if (meetingId && meeting?.host_id === user?.id) {
        await meetingApi.endMeeting(meetingId);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("Error ending meeting:", err);
    }
  }, [meetingId, meeting, user, navigate]);

  const copyInviteLink = useCallback(async () => {
    try {
      const inviteLink = `${window.location.origin}/join/${meetingId}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Failed to copy invite link:", err);
      alert("Failed to copy link. Please try again.");
    }
  }, [meetingId]);

  const toggleSpeaker = useCallback(() => {
    const newMuted = !speakerMuted;
    setSpeakerMuted(newMuted);

    // Mute/unmute all remote video elements
    Object.values(remoteVideosRef.current).forEach((video) => {
      if (video) {
        video.muted = newMuted;
      }
    });
  }, [speakerMuted]);

  const handleVolumeChange = useCallback(
    (event: Event, newValue: number | number[]) => {
      const volume = Array.isArray(newValue) ? newValue[0] : newValue;
      setSpeakerVolume(volume);

      // Set volume for all remote video elements
      Object.values(remoteVideosRef.current).forEach((video) => {
        if (video) {
          video.volume = volume / 100;
        }
      });
    },
    []
  );

  const handleVolumeMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setVolumeMenuAnchor(event.currentTarget);
    },
    []
  );

  const handleVolumeMenuClose = useCallback(() => {
    setVolumeMenuAnchor(null);
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography>Joining meeting...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#1e1e1e",
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: "#2d2d2d", color: "white" }}>
        <Typography variant="h6">{meeting?.title}</Typography>
        <Typography variant="body2" color="gray">
          Meeting ID: {meetingId}
        </Typography>
      </Box>

      {/* Video Grid */}
      <Box sx={{ flex: 1, p: 2 }}>
        <Grid container spacing={2} sx={{ height: "100%" }}>
          {/* Local Video */}
          <Grid item xs={12} md={participants.length > 0 ? 6 : 12}>
            <Paper
              sx={{
                height: "100%",
                position: "relative",
                bgcolor: "#000",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

              {/* Local video overlay */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  color: "white",
                  bgcolor: "rgba(0,0,0,0.7)",
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">{userName} (You)</Typography>
              </Box>

              {/* Media status indicators */}
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  display: "flex",
                  gap: 1,
                }}
              >
                {!localVideoEnabled && (
                  <Chip icon={<VideocamOff />} label="Video Off" size="small" />
                )}
                {!localAudioEnabled && (
                  <Chip icon={<MicOff />} label="Muted" size="small" />
                )}
                {screenSharing && (
                  <Chip icon={<ScreenShare />} label="Sharing" size="small" />
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <Grid item xs={12} md={6} key={participant.id}>
              <Paper
                sx={{
                  height: "100%",
                  position: "relative",
                  bgcolor: "#000",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <video
                  ref={(el) => {
                    remoteVideosRef.current[participant.id] = el;
                  }}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Participant overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.7)",
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">
                    {participant.name}
                    {participant.isHost && " (Host)"}
                  </Typography>
                </Box>

                {/* Participant media status */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    display: "flex",
                    gap: 1,
                  }}
                >
                  {!participant.videoEnabled && (
                    <Chip
                      icon={<VideocamOff />}
                      label="Video Off"
                      size="small"
                    />
                  )}
                  {!participant.audioEnabled && (
                    <Chip icon={<MicOff />} label="Muted" size="small" />
                  )}
                  {participant.screenSharing && (
                    <Chip icon={<ScreenShare />} label="Sharing" size="small" />
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Controls */}
      <Box
        sx={{
          p: 2,
          bgcolor: "#2d2d2d",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* Video toggle */}
        <Tooltip
          title={localVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          <IconButton
            onClick={toggleVideo}
            sx={{
              bgcolor: localVideoEnabled ? "transparent" : "error.main",
              color: "white",
              "&:hover": {
                bgcolor: localVideoEnabled
                  ? "rgba(255,255,255,0.1)"
                  : "error.dark",
              },
            }}
          >
            {localVideoEnabled ? <Videocam /> : <VideocamOff />}
          </IconButton>
        </Tooltip>

        {/* Audio toggle */}
        <Tooltip
          title={localAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          <IconButton
            onClick={toggleAudio}
            sx={{
              bgcolor: localAudioEnabled ? "transparent" : "error.main",
              color: "white",
              "&:hover": {
                bgcolor: localAudioEnabled
                  ? "rgba(255,255,255,0.1)"
                  : "error.dark",
              },
            }}
          >
            {localAudioEnabled ? <Mic /> : <MicOff />}
          </IconButton>
        </Tooltip>

        {/* Speaker/Volume toggle */}
        <Tooltip title={speakerMuted ? "Unmute speaker" : "Mute speaker"}>
          <IconButton
            onClick={handleVolumeMenuOpen}
            sx={{
              bgcolor: speakerMuted ? "error.main" : "transparent",
              color: "white",
              "&:hover": {
                bgcolor: speakerMuted ? "error.dark" : "rgba(255,255,255,0.1)",
              },
            }}
          >
            {speakerMuted ? (
              <VolumeOff />
            ) : speakerVolume > 50 ? (
              <VolumeUp />
            ) : (
              <VolumeMute />
            )}
          </IconButton>
        </Tooltip>

        {/* Screen share toggle */}
        <Tooltip title={screenSharing ? "Stop sharing" : "Share screen"}>
          <IconButton
            onClick={toggleScreenShare}
            sx={{
              bgcolor: screenSharing ? "primary.main" : "transparent",
              color: "white",
              "&:hover": {
                bgcolor: screenSharing
                  ? "primary.dark"
                  : "rgba(255,255,255,0.1)",
              },
            }}
          >
            {screenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
        </Tooltip>

        {/* Chat */}
        <Tooltip title="Chat">
          <IconButton onClick={() => setChatOpen(true)} sx={{ color: "white" }}>
            <Chat />
          </IconButton>
        </Tooltip>

        {/* Participants */}
        <Tooltip title="Participants">
          <IconButton
            onClick={() => setParticipantsOpen(true)}
            sx={{ color: "white" }}
          >
            <Badge badgeContent={participants.length + 1} color="primary">
              <People />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Settings */}
        <Tooltip title="Settings">
          <IconButton sx={{ color: "white" }}>
            <Settings />
          </IconButton>
        </Tooltip>

        {/* Copy Invite Link */}
        <Tooltip title={copySuccess ? "Link copied!" : "Copy invite link"}>
          <IconButton
            onClick={copyInviteLink}
            sx={{
              color: copySuccess ? "success.main" : "white",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            {copySuccess ? <ContentCopy /> : <LinkIcon />}
          </IconButton>
        </Tooltip>

        {/* End/Leave meeting */}
        {meeting?.host_id === user?.id ? (
          <Tooltip title="End meeting">
            <IconButton
              onClick={endMeeting}
              sx={{
                bgcolor: "error.main",
                color: "white",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <CallEnd />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Leave meeting">
            <IconButton
              onClick={leaveMeeting}
              sx={{
                bgcolor: "error.main",
                color: "white",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <CallEnd />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Volume Control Menu */}
      <Menu
        anchorEl={volumeMenuAnchor}
        open={Boolean(volumeMenuAnchor)}
        onClose={handleVolumeMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <MenuItem>
          <Stack
            spacing={2}
            direction="row"
            sx={{ minWidth: 200, px: 2, py: 1 }}
          >
            <IconButton
              size="small"
              onClick={toggleSpeaker}
              sx={{ color: speakerMuted ? "error.main" : "inherit" }}
            >
              {speakerMuted ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
            <Slider
              value={speakerMuted ? 0 : speakerVolume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              min={0}
              max={100}
              disabled={speakerMuted}
              sx={{ flexGrow: 1 }}
            />
            <Typography
              variant="body2"
              sx={{ minWidth: 35, textAlign: "right" }}
            >
              {speakerMuted ? "0%" : `${speakerVolume}%`}
            </Typography>
          </Stack>
        </MenuItem>
      </Menu>

      {/* Participants Dialog */}
      {/* Participants Dialog */}
      <Dialog
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Participants ({participants.length + 1})</DialogTitle>
        <DialogContent>
          <List>
            {/* Current user */}
            <ListItem>
              <ListItemAvatar>
                <Avatar src={userAvatar}>{userName?.charAt(0)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${userName} (You)`}
                secondary={
                  meeting?.host_id === user?.id ? "Host" : "Participant"
                }
              />
            </ListItem>

            {/* Other participants */}
            {participants.map((participant) => (
              <ListItem key={participant.id}>
                <ListItemAvatar>
                  <Avatar src={participant.avatar}>
                    {participant.name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={participant.name}
                  secondary={participant.isHost ? "Host" : "Participant"}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Copy Success Notification */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopySuccess(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Invite link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FullMeetingRoom;
