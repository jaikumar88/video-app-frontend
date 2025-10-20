import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  TextField,
  Button,
  Alert,
  CircularProgress,
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
  Send,
  Close,
  PersonAdd,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { meetingApi } from "../services/api";
import { meetingApi as fullMeetingApi } from "../services/meetingApi";
import InviteParticipantsDialog from "./InviteParticipantsDialog";
import GuestInfoDialog from "./GuestInfoDialog";

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

interface MeetingInfo {
  meeting_id: string;
  title: string;
  host_user_id: string;
  status: string;
  started_at?: string;
}

interface ChatMessage {
  id: string;
  from: string;
  message: string;
  timestamp: string;
}

const FullMeetingRoom: React.FC<{ invitationToken?: string | null }> = ({
  invitationToken,
}) => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  // State
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [guestInfoDialogOpen, setGuestInfoDialogOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Meeting");

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement | null }>(
    {}
  );

  // Initialize meeting
  useEffect(() => {
    if (!meetingId) {
      setError("Missing meeting ID");
      setLoading(false);
      return;
    }

    // Check if user has access (authenticated OR has invitation token OR has guest session)
    const hasGuestSession =
      sessionStorage.getItem("guestMeetingAccess") !== null;
    const hasAccess = (user && token) || invitationToken || hasGuestSession;

    if (!hasAccess) {
      setError(
        "No access to meeting. Please authenticate or use invitation link."
      );
      setLoading(false);
      return;
    }

    initializeMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, user, token, invitationToken]);

  const initializeMeeting = async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug environment variables
      console.log("Environment check:", {
        NODE_ENV: process.env.NODE_ENV,
        API_URL: process.env.REACT_APP_API_URL,
        WS_URL: process.env.REACT_APP_WS_URL,
        FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL,
        meetingId: meetingId,
        hasUser: !!user,
        hasToken: !!token,
        hasInvitationToken: !!invitationToken,
      });

      let meetingInfo;
      let displayName;
      let email;
      let isHost = false;

      if (invitationToken) {
        // Handle invitation token flow
        console.log("Processing invitation token:", invitationToken);
        console.log("API base URL:", process.env.REACT_APP_API_URL);

        try {
          console.log("Calling acceptInvitation API...");
          const invitationResponse =
            await fullMeetingApi.acceptInvitation(invitationToken);
          console.log("Invitation accepted successfully:", invitationResponse);

          // For guests with invitation tokens, prompt for name if not authenticated
          if (!user) {
            displayName =
              prompt("Please enter your name to join the meeting:") || "Guest";
            email = prompt(
              "Please enter your email (optional - you can leave this blank):"
            );
          } else {
            displayName = `${user.first_name} ${user.last_name}`;
            email = user.email;
          }

          // Join as guest or authenticated user
          if (user && token) {
            const joinData = {
              display_name: displayName,
              video_enabled: localVideoEnabled,
              audio_enabled: localAudioEnabled,
            };
            meetingInfo = await meetingApi.joinMeeting(meetingId!, joinData);
            isHost = meetingInfo.host_user_id === user.id;
          } else {
            const guestInfo: { name: string; email?: string } = {
              name: displayName,
            };

            // Only add email if it's provided and valid
            if (email && email.trim()) {
              guestInfo.email = email.trim();
            }

            console.log("Guest info being sent:", guestInfo);
            const guestResponse = await fullMeetingApi.joinMeetingAsGuest(
              meetingId!,
              guestInfo
            );
            console.log("Guest join response:", guestResponse);

            // Create a mock meeting object from the guest response since backend doesn't return full meeting info
            meetingInfo = {
              id: meetingId!,
              title: "Meeting", // Default title since backend doesn't provide it
              description: undefined,
              host_id: "unknown",
              host_name: "Unknown Host",
              meeting_url: window.location.href,
              status: "active" as const,
              created_at: new Date().toISOString(),
              scheduled_at: undefined,
              started_at: new Date().toISOString(),
              ended_at: undefined,
              duration_minutes: 60,
              max_participants: 100,
              participant_count: 1,
              settings: {
                allow_recording: false,
                allow_screen_sharing: true,
                require_host_approval: false,
                mute_participants_on_join: false,
                disable_video_on_join: false,
              },
              webrtc_config: {
                ice_servers: guestResponse.webrtc_config.iceServers.map(
                  (server) => ({
                    urls: Array.isArray(server.urls)
                      ? server.urls
                      : [server.urls],
                    username: server.username,
                    credential: server.credential,
                  })
                ),
              },
            };

            // Store guest token and websocket URL for future use
            sessionStorage.setItem("guestToken", guestResponse.meeting_token);
            sessionStorage.setItem("websocketUrl", guestResponse.websocket_url);
            sessionStorage.setItem(
              "participantId",
              guestResponse.participant_id
            );
          }
        } catch (inviteError: any) {
          console.error("Failed to accept invitation:", inviteError);
          console.error("Error details:", {
            message: inviteError.message,
            response: inviteError.response?.data,
            status: inviteError.response?.status,
            url: inviteError.config?.url,
          });

          let errorMessage = "Invalid or expired invitation link.";
          if (inviteError.response?.status === 404) {
            errorMessage = "Invitation not found or expired.";
          } else if (inviteError.response?.status === 403) {
            errorMessage = "Access denied. Please check your invitation link.";
          } else if (
            inviteError.code === "NETWORK_ERROR" ||
            inviteError.message.includes("Network Error")
          ) {
            errorMessage =
              "Network error. Please check if the backend server is running.";
          }

          setError(errorMessage + " Please contact the meeting host.");
          setLoading(false);
          return;
        }
      } else {
        // Check if this is a guest session (from direct meeting ID join)
        const guestSessionData = sessionStorage.getItem("guestMeetingAccess");
        
        if (guestSessionData) {
          // Handle guest session - user already joined via JoinByCodePage
          console.log("Using existing guest session");
          const guestData = JSON.parse(guestSessionData);
          
          displayName = guestData.guestName || "Guest";
          email = undefined;
          
          // Create a mock meeting object from guest session data
          meetingInfo = {
            id: meetingId!,
            title: "Meeting",
            description: undefined,
            host_id: "unknown",
            host_name: "Unknown Host",
            meeting_url: window.location.href,
            status: "active" as const,
            created_at: new Date().toISOString(),
            scheduled_at: undefined,
            started_at: new Date().toISOString(),
            ended_at: undefined,
            duration_minutes: 60,
            max_participants: 100,
            participant_count: 1,
            settings: {
              allow_recording: false,
              allow_screen_sharing: true,
              require_host_approval: false,
              mute_participants_on_join: false,
              disable_video_on_join: false,
            },
            webrtc_config: {
              ice_servers: [],
            },
          };
          
        } else if (user && token) {
          // Regular authenticated user flow
          displayName = `${user.first_name} ${user.last_name}`;
          email = user.email;

          const joinData = {
            display_name: displayName,
            video_enabled: localVideoEnabled,
            audio_enabled: localAudioEnabled,
          };
          meetingInfo = await meetingApi.joinMeeting(meetingId!, joinData);
          isHost = meetingInfo.host_user_id === user.id;
        } else {
          // No authentication and no guest session
          setError("Authentication required. Please login or join as guest.");
          setLoading(false);
          return;
        }
      }

      setMeeting(meetingInfo);
      setMeetingTitle(meetingInfo.title || "Meeting");

      // Get user media
      await initializeLocalMedia();

      // Add current user as participant
      const currentParticipant: Participant = {
        id: user?.id || "guest-" + Date.now(),
        name: displayName || "Guest",
        email: email || "",
        avatar: user?.avatar_url || undefined,
        isHost: isHost,
        videoEnabled: localVideoEnabled,
        audioEnabled: localAudioEnabled,
        screenSharing: false,
      };

      setParticipants([currentParticipant]);
      setLoading(false);
    } catch (err) {
      console.error("Failed to initialize meeting:", err);
      setError(
        "Failed to join meeting. Please check your connection and try again."
      );
      setLoading(false);
    }
  };

  const initializeLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set initial media states based on stream tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = localVideoEnabled;
      }

      if (audioTrack) {
        audioTrack.enabled = localAudioEnabled;
      }
    } catch (err) {
      console.error("Failed to get user media:", err);
      setError(
        "Failed to access camera and microphone. Please allow permissions and refresh."
      );
    }
  }, [localVideoEnabled, localAudioEnabled]);

  // Media controls
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !localVideoEnabled;
        setLocalVideoEnabled(!localVideoEnabled);

        // Update participant state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === user?.id ? { ...p, videoEnabled: !localVideoEnabled } : p
          )
        );
      }
    }
  }, [localStream, localVideoEnabled, user?.id]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !localAudioEnabled;
        setLocalAudioEnabled(!localAudioEnabled);

        // Update participant state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === user?.id ? { ...p, audioEnabled: !localAudioEnabled } : p
          )
        );
      }
    }
  }, [localStream, localAudioEnabled, user?.id]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Replace video track with screen share
        if (localStream) {
          const videoTrack = screenStream.getVideoTracks()[0];

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }

          // Listen for screen share end
          videoTrack.onended = () => {
            setScreenSharing(false);
            // Switch back to camera
            initializeLocalMedia();
          };
        }

        setScreenSharing(true);
      } else {
        // Stop screen sharing and go back to camera
        setScreenSharing(false);
        await initializeLocalMedia();
      }
    } catch (err) {
      console.error("Screen sharing failed:", err);
    }
  }, [screenSharing, localStream, initializeLocalMedia]);

  const endCall = useCallback(async () => {
    try {
      if (meetingId) {
        await meetingApi.leaveMeeting(meetingId);
      }

      // Stop all media tracks
      if (localStream) {
        for (const track of localStream.getTracks()) {
          track.stop();
        }
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to leave meeting:", err);
      navigate("/dashboard");
    }
  }, [meetingId, localStream, navigate]);

  // Chat functions
  const sendMessage = () => {
    if (newMessage.trim() && user) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        from: `${user.first_name} ${user.last_name}`,
        message: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString(),
      };

      setChatMessages((prev) => [...prev, message]);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        for (const track of localStream.getTracks()) {
          track.stop();
        }
      }
    };
  }, [localStream]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Joining meeting...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        p={2}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: "#121212",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: "#1e1e1e", borderBottom: "1px solid #333" }}>
        <Typography variant="h6" color="white">
          {meeting?.title || "Meeting Room"}
        </Typography>
        <Typography variant="body2" color="grey.400">
          {participants.length} participant
          {participants.length === 1 ? "" : "s"}
        </Typography>
      </Box>

      {/* Main video area */}
      <Box sx={{ flex: 1, display: "flex", position: "relative" }}>
        {/* Video Grid */}
        <Box sx={{ flex: 1, p: 2 }}>
          <Grid container spacing={2} sx={{ height: "100%" }}>
            {/* Local video */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  position: "relative",
                  height: "100%",
                  minHeight: 300,
                  bgcolor: "#000",
                  overflow: "hidden",
                  borderRadius: 2,
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
                {!localVideoEnabled && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#333",
                    }}
                  >
                    <Avatar sx={{ width: 80, height: 80 }}>
                      {user?.first_name?.[0]}
                      {user?.last_name?.[0]}
                    </Avatar>
                  </Box>
                )}

                {/* Participant info overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    bgcolor: "rgba(0,0,0,0.7)",
                    color: "white",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography variant="body2">
                    {user?.first_name} {user?.last_name} (You)
                  </Typography>
                  {!localAudioEnabled && <MicOff fontSize="small" />}
                  {screenSharing && <ScreenShare fontSize="small" />}
                </Box>
              </Paper>
            </Grid>

            {/* Remote participants */}
            {participants
              .filter((p) => p.id !== user?.id)
              .map((participant) => (
                <Grid item xs={12} md={6} key={participant.id}>
                  <Paper
                    sx={{
                      position: "relative",
                      height: "100%",
                      minHeight: 300,
                      bgcolor: "#333",
                      overflow: "hidden",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Avatar sx={{ width: 80, height: 80 }}>
                      {participant.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Avatar>

                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        bgcolor: "rgba(0,0,0,0.7)",
                        color: "white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography variant="body2">
                        {participant.name}
                      </Typography>
                      {!participant.audioEnabled && <MicOff fontSize="small" />}
                      {participant.isHost && (
                        <Chip label="Host" size="small" color="primary" />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
          </Grid>
        </Box>

        {/* Chat Sidebar */}
        {chatOpen && (
          <Paper
            sx={{
              width: 300,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#1e1e1e",
              borderLeft: "1px solid #333",
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" color="white">
                Chat
              </Typography>
              <IconButton onClick={() => setChatOpen(false)} size="small">
                <Close sx={{ color: "white" }} />
              </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
              {chatMessages.map((msg) => (
                <Box key={msg.id} sx={{ mb: 2 }}>
                  <Typography variant="caption" color="grey.400">
                    {msg.from} - {msg.timestamp}
                  </Typography>
                  <Typography variant="body2" color="white">
                    {msg.message}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ p: 2, borderTop: "1px solid #333" }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    "& fieldset": { borderColor: "#333" },
                    "&:hover fieldset": { borderColor: "#555" },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={sendMessage} size="small">
                      <Send sx={{ color: "white" }} />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          </Paper>
        )}

        {/* Participants Sidebar */}
        {participantsOpen && (
          <Paper
            sx={{
              width: 300,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#1e1e1e",
              borderLeft: "1px solid #333",
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" color="white">
                Participants ({participants.length})
              </Typography>
              <IconButton
                onClick={() => setParticipantsOpen(false)}
                size="small"
              >
                <Close sx={{ color: "white" }} />
              </IconButton>
            </Box>

            <List sx={{ flex: 1, overflow: "auto" }}>
              {participants.map((participant) => (
                <ListItem key={participant.id}>
                  <ListItemAvatar>
                    <Badge
                      color={participant.videoEnabled ? "success" : "default"}
                      variant="dot"
                    >
                      <Avatar>
                        {participant.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography color="white">
                        {participant.name}
                        {participant.id === user?.id && " (You)"}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        {participant.isHost && (
                          <Chip label="Host" size="small" color="primary" />
                        )}
                        {!participant.audioEnabled && (
                          <MicOff fontSize="small" sx={{ color: "grey.400" }} />
                        )}
                        {!participant.videoEnabled && (
                          <VideocamOff
                            fontSize="small"
                            sx={{ color: "grey.400" }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      {/* Controls */}
      <Box
        sx={{
          p: 2,
          bgcolor: "#1e1e1e",
          borderTop: "1px solid #333",
          display: "flex",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Tooltip title={localAudioEnabled ? "Mute" : "Unmute"}>
          <IconButton
            onClick={toggleAudio}
            sx={{
              bgcolor: localAudioEnabled ? "#333" : "#f44336",
              color: "white",
              "&:hover": {
                bgcolor: localAudioEnabled ? "#555" : "#d32f2f",
              },
            }}
          >
            {localAudioEnabled ? <Mic /> : <MicOff />}
          </IconButton>
        </Tooltip>

        <Tooltip title={localVideoEnabled ? "Stop Video" : "Start Video"}>
          <IconButton
            onClick={toggleVideo}
            sx={{
              bgcolor: localVideoEnabled ? "#333" : "#f44336",
              color: "white",
              "&:hover": {
                bgcolor: localVideoEnabled ? "#555" : "#d32f2f",
              },
            }}
          >
            {localVideoEnabled ? <Videocam /> : <VideocamOff />}
          </IconButton>
        </Tooltip>

        <Tooltip title={screenSharing ? "Stop Sharing" : "Share Screen"}>
          <IconButton
            onClick={toggleScreenShare}
            sx={{
              bgcolor: screenSharing ? "#4caf50" : "#333",
              color: "white",
              "&:hover": {
                bgcolor: screenSharing ? "#388e3c" : "#555",
              },
            }}
          >
            {screenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Chat">
          <IconButton
            onClick={() => setChatOpen(!chatOpen)}
            sx={{
              bgcolor: chatOpen ? "#2196f3" : "#333",
              color: "white",
              "&:hover": {
                bgcolor: chatOpen ? "#1976d2" : "#555",
              },
            }}
          >
            <Chat />
          </IconButton>
        </Tooltip>

        <Tooltip title="Participants">
          <IconButton
            onClick={() => setParticipantsOpen(!participantsOpen)}
            sx={{
              bgcolor: participantsOpen ? "#2196f3" : "#333",
              color: "white",
              "&:hover": {
                bgcolor: participantsOpen ? "#1976d2" : "#555",
              },
            }}
          >
            <People />
          </IconButton>
        </Tooltip>

        <Tooltip title="Invite Participants">
          <IconButton
            onClick={() => setInviteDialogOpen(true)}
            sx={{
              bgcolor: "#9c27b0",
              color: "white",
              "&:hover": {
                bgcolor: "#7b1fa2",
              },
            }}
          >
            <PersonAdd />
          </IconButton>
        </Tooltip>

        <Tooltip title="End Call">
          <IconButton
            onClick={endCall}
            sx={{
              bgcolor: "#f44336",
              color: "white",
              ml: 2,
              "&:hover": {
                bgcolor: "#d32f2f",
              },
            }}
          >
            <CallEnd />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Invitation Dialog */}
      <InviteParticipantsDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        meetingId={meetingId!}
        meetingTitle={meetingTitle}
        onInvitationsSent={(invitations) => {
          console.log("Invitations sent:", invitations);

          // Generate the full invitation URLs for debugging
          console.log("=== INVITATION URLS GENERATED ===");
          invitations.forEach((invitation) => {
            if (invitation.invitation_token) {
              const invitationUrl = `${process.env.REACT_APP_FRONTEND_URL || window.location.origin}/meeting/${meetingId}?token=${invitation.invitation_token}`;
              console.log(`✅ ${invitation.email}: ${invitationUrl}`);
            } else {
              console.error(
                `❌ Missing token for ${invitation.email} - Backend issue!`
              );
            }
          });
          console.log("=================================");
        }}
      />
    </Box>
  );
};

export default FullMeetingRoom;
