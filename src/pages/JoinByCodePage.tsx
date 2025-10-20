import React, { useState } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { MeetingRoom, QrCodeScanner } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { meetingApi } from "../services/meetingApi";

const JoinByCodePage: React.FC = () => {
  const [meetingId, setMeetingId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleJoinMeeting = async () => {
    if (!meetingId.trim()) {
      setError("Please enter a meeting ID");
      return;
    }

    if (!guestName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Attempting to join meeting as guest:", {
        meetingId: meetingId.trim(),
        name: guestName.trim(),
        email: guestEmail.trim() || undefined,
      });

      // Prepare guest info
      const guestInfo: { name: string; email?: string } = {
        name: guestName.trim(),
      };

      // Only add email if provided
      if (guestEmail.trim()) {
        guestInfo.email = guestEmail.trim();
      }

      // Join meeting as guest
      const response = await meetingApi.joinMeetingAsGuest(
        meetingId.trim(),
        guestInfo
      );
      console.log("Guest join response:", response);

      // Store guest session info for routing access
      sessionStorage.setItem(
        "guestMeetingAccess",
        JSON.stringify({
          meetingId: meetingId.trim(),
          guestName: guestInfo.name,
          joinedAt: new Date().toISOString(),
          token: response.meeting_token,
          participantId: response.participant_id,
          websocketUrl: response.websocket_url,
        })
      );

      // Navigate to the meeting page
      navigate(`/meeting/${meetingId.trim()}`);
    } catch (error: any) {
      console.error("Error joining meeting:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });

      if (error.response?.status === 404) {
        setError(
          "Meeting not found. Please check the meeting ID and try again."
        );
      } else if (error.response?.status === 403) {
        setError("Access denied. The meeting may require authentication.");
      } else if (error.code === "NETWORK_ERROR" || !error.response) {
        setError(
          "Cannot connect to server. Please check your internet connection."
        );
      } else {
        setError(
          `Failed to join meeting: ${error.response?.data?.detail || error.message}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleJoinMeeting();
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <MeetingRoom sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Join Meeting as Guest
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter the meeting ID and your information to join
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Meeting ID"
            placeholder="Enter meeting ID (e.g., 48240530205)"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <QrCodeScanner />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Your Name"
            placeholder="Enter your full name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Email Address"
            placeholder="Enter your email (optional)"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            helperText="Optional - you can leave this blank"
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleJoinMeeting}
            disabled={loading || !meetingId.trim() || !guestName.trim()}
            sx={{ mb: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Join Meeting"
            )}
          </Button>
        </Box>

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Don't have a meeting ID?{" "}
            <Button
              variant="text"
              size="small"
              onClick={() => navigate("/login")}
            >
              Sign in to create or join meetings
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default JoinByCodePage;
