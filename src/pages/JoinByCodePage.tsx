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
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleJoinMeeting = async () => {
    if (!invitationCode.trim()) {
      setError("Please enter an invitation code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Attempting to accept invitation with code:", invitationCode.trim());
      console.log("API URL:", process.env.REACT_APP_API_URL);
      
      // Accept the invitation using the code
      const response = await meetingApi.acceptInvitation(invitationCode.trim());
      console.log("Invitation acceptance response:", response);
      
      // Navigate to the meeting page with the meeting ID
      navigate(`/meeting/${response.meeting_id}?token=${invitationCode.trim()}`);
    } catch (error: any) {
      console.error("Error joining meeting:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      
      if (error.response?.status === 404) {
        setError("Invalid invitation code. Please check the code and try again.");
      } else if (error.response?.status === 400) {
        setError("This invitation code has expired or is no longer valid.");
      } else if (error.code === "NETWORK_ERROR" || !error.response) {
        setError("Cannot connect to server. Please check your internet connection.");
      } else {
        setError(`Failed to join meeting: ${error.response?.data?.detail || error.message}`);
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
            Join Meeting
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your invitation code to join the meeting
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Invitation Code"
            placeholder="Enter invitation code (e.g., inv_123456789)"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
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
            disabled={loading || !invitationCode.trim()}
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
            Don't have an invitation code?{" "}
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