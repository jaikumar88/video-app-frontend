import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  VideoCall as VideoCallIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../store";
import { meetingApi } from "../services/api";

const DashboardPage: React.FC = () => {
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [meetingIdToJoin, setMeetingIdToJoin] = useState("");
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDescription, setNewMeetingDescription] = useState("");
  const { token, user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const requestVerification = async () => {
    setVerificationLoading(true);
    try {
      const response = await fetch("/api/v1/auth/request-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setVerificationMessage("Verification codes sent successfully!");
      } else {
        setVerificationMessage("Failed to send verification codes.");
      }
    } catch (error) {
      setVerificationMessage("Network error occurred.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const startInstantMeeting = async () => {
    setMeetingLoading(true);
    try {
      const meetingData = {
        title: `${user?.first_name}'s Meeting - ${new Date().toLocaleString()}`,
        description: "Instant meeting started from dashboard",
      };

      const meeting = await meetingApi.createMeeting(meetingData);
      navigate(`/meeting/${meeting.meeting_id}`);
    } catch (error) {
      console.error("Failed to create meeting:", error);
      alert("Failed to start meeting. Please try again.");
    } finally {
      setMeetingLoading(false);
    }
  };

  const createScheduledMeeting = async () => {
    if (!newMeetingTitle.trim()) {
      alert("Please enter a meeting title");
      return;
    }

    setMeetingLoading(true);
    try {
      const meetingData = {
        title: newMeetingTitle,
        description: newMeetingDescription,
      };

      const meeting = await meetingApi.createMeeting(meetingData);
      setMeetingDialogOpen(false);
      setNewMeetingTitle("");
      setNewMeetingDescription("");
      navigate(`/meeting/${meeting.meeting_id}`);
    } catch (error) {
      console.error("Failed to create meeting:", error);
      alert("Failed to create meeting. Please try again.");
    } finally {
      setMeetingLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    setJoinDialogOpen(true);
  };

  const joinMeetingById = async () => {
    if (!meetingIdToJoin.trim()) {
      alert("Please enter a meeting ID");
      return;
    }

    setMeetingLoading(true);
    try {
      // Navigate directly to the meeting page - the meeting component will handle joining
      navigate(`/meeting/${meetingIdToJoin.trim()}`);
    } catch (error) {
      console.error("Failed to join meeting:", error);
      alert("Failed to join meeting. Please check the meeting ID.");
    } finally {
      setMeetingLoading(false);
      setJoinDialogOpen(false);
      setMeetingIdToJoin("");
    }
  };

  const recentMeetings = [
    {
      id: "1",
      title: "Team Standup",
      date: "2025-10-19T09:00:00Z",
      participants: 5,
      status: "completed",
    },
    {
      id: "2",
      title: "Client Review",
      date: "2025-10-19T14:00:00Z",
      participants: 8,
      status: "upcoming",
    },
    {
      id: "3",
      title: "Project Planning",
      date: "2025-10-18T16:00:00Z",
      participants: 12,
      status: "completed",
    },
  ];

  const upcomingMeetings = recentMeetings.filter(
    (m) => m.status === "upcoming"
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Dashboard
            </Typography>
            <Typography color="text.secondary">
              Welcome back! Manage your meetings and connections.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<VideoCallIcon />}
            size="large"
            onClick={startInstantMeeting}
            disabled={meetingLoading}
          >
            {meetingLoading ? "Starting..." : "Start Meeting"}
          </Button>
        </Box>

        {/* Verification Status Alert */}
        {user && !user.email_verified && !user.phone_verified && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Account Verification Required</AlertTitle>
            Your account is not verified. Please verify your email or phone
            number to access all features.
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SendIcon />}
                onClick={requestVerification}
                disabled={verificationLoading}
              >
                {verificationLoading ? "Sending..." : "Resend Verification"}
              </Button>
            </Box>
            {verificationMessage && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {verificationMessage}
              </Typography>
            )}
          </Alert>
        )}

        {/* Quick Actions */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: "center", p: 2 }}>
              <CardContent>
                <Avatar sx={{ bgcolor: "primary.main", mx: "auto", mb: 2 }}>
                  <VideoCallIcon />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Start Meeting
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={startInstantMeeting}
                  disabled={meetingLoading}
                >
                  {meetingLoading ? "Starting..." : "Start Now"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: "center", p: 2 }}>
              <CardContent>
                <Avatar sx={{ bgcolor: "secondary.main", mx: "auto", mb: 2 }}>
                  <AddIcon />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Schedule Meeting
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setMeetingDialogOpen(true)}
                >
                  Schedule
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: "center", p: 2 }}>
              <CardContent>
                <Avatar sx={{ bgcolor: "info.main", mx: "auto", mb: 2 }}>
                  <ScheduleIcon />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Join Meeting
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleJoinMeeting}
                >
                  Join
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: "center", p: 2 }}>
              <CardContent>
                <Avatar sx={{ bgcolor: "warning.main", mx: "auto", mb: 2 }}>
                  <HistoryIcon />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Meeting History
                </Typography>
                <Button variant="outlined" size="small">
                  View All
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Upcoming Meetings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Meetings
                </Typography>
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map((meeting) => (
                    <Box
                      key={meeting.id}
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 2,
                        "&:last-child": { mb: 0 },
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        {meeting.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        {new Date(meeting.date).toLocaleString()}
                      </Typography>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Chip
                          label={`${meeting.participants} participants`}
                          size="small"
                          variant="outlined"
                        />
                        <Button size="small" variant="contained">
                          Join
                        </Button>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography color="text.secondary">
                    No upcoming meetings
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                {recentMeetings.map((meeting) => (
                  <Box
                    key={meeting.id}
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      mb: 2,
                      "&:last-child": { mb: 0 },
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {meeting.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      {new Date(meeting.date).toLocaleString()}
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Chip
                        label={meeting.status}
                        size="small"
                        color={
                          meeting.status === "completed" ? "success" : "primary"
                        }
                      />
                      <Typography variant="body2" color="text.secondary">
                        {meeting.participants} participants
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Schedule Meeting Dialog */}
        <Dialog
          open={meetingDialogOpen}
          onClose={() => setMeetingDialogOpen(false)}
        >
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Meeting Title"
              fullWidth
              variant="outlined"
              value={newMeetingTitle}
              onChange={(e) => setNewMeetingTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description (Optional)"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={newMeetingDescription}
              onChange={(e) => setNewMeetingDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMeetingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={createScheduledMeeting}
              variant="contained"
              disabled={meetingLoading || !newMeetingTitle.trim()}
            >
              {meetingLoading ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Join Meeting Dialog */}
        <Dialog
          open={joinDialogOpen}
          onClose={() => setJoinDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Join Meeting</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="meetingId"
              label="Meeting ID"
              placeholder="Enter meeting ID (e.g., 48240530205)"
              fullWidth
              variant="outlined"
              value={meetingIdToJoin}
              onChange={(e) => setMeetingIdToJoin(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  joinMeetingById();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={joinMeetingById}
              variant="contained"
              disabled={meetingLoading || !meetingIdToJoin.trim()}
            >
              {meetingLoading ? "Joining..." : "Join Meeting"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DashboardPage;
