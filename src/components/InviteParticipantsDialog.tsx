import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { meetingApi, InvitationResponse } from "../services/meetingApi";

interface InviteParticipantsDialogProps {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
  onInvitationsSent: (invitations: InvitationResponse[]) => void;
}

const InviteParticipantsDialog: React.FC<InviteParticipantsDialogProps> = ({
  open,
  onClose,
  meetingId,
  meetingTitle,
  onInvitationsSent,
}) => {
  const [emails, setEmails] = useState<string[]>([""]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [role, setRole] = useState("participant");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    if (currentEmail && isValidEmail(currentEmail)) {
      if (!emails.includes(currentEmail)) {
        setEmails([...emails.filter((e) => e !== ""), currentEmail]);
        setCurrentEmail("");
        setError(null);
      } else {
        setError("Email already added");
      }
    } else {
      setError("Please enter a valid email address");
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleEmailKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addEmail();
    }
  };

  const handleSendInvitations = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const validEmails = emails.filter(
        (email) => email && isValidEmail(email)
      );

      if (validEmails.length === 0) {
        throw new Error("Please add at least one valid email address");
      }

      const response = await meetingApi.inviteMultipleParticipants(
        meetingId,
        validEmails,
        role,
        message || undefined
      );

      console.log("Invitation API response:", response);
      console.log("Individual invitations:", response.invitations);

      // Log each invitation token for debugging
      response.invitations.forEach((invitation, index) => {
        console.log(`Invitation ${index + 1} for ${invitation.email}:`, {
          token: invitation.invitation_token,
          meeting_id: invitation.meeting_id,
          expires_at: invitation.expires_at,
        });
      });

      setSuccess(
        `Successfully sent ${response.invitations.length} invitation(s)`
      );
      onInvitationsSent(response.invitations);

      // Reset form
      setEmails([""]);
      setCurrentEmail("");
      setMessage("");

      // Close dialog after a brief delay
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to send invitations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmails([""]);
    setCurrentEmail("");
    setMessage("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Invite Participants to "{meetingTitle}"
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Email Addresses
          </Typography>

          <Box display="flex" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Enter email address"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyPress={handleEmailKeyPress}
              fullWidth
              type="email"
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addEmail}
              disabled={!currentEmail || !isValidEmail(currentEmail)}
            >
              Add
            </Button>
          </Box>

          {emails.filter((email) => email).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Emails to invite:
              </Typography>
              <List dense>
                {emails
                  .filter((email) => email)
                  .map((email, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText primary={email} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => removeEmail(email)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value)}
            >
              <MenuItem value="participant">Participant</MenuItem>
              <MenuItem value="moderator">Moderator</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box>
          <TextField
            label="Custom Message (Optional)"
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message to include with the invitation..."
            fullWidth
            size="small"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          onClick={handleSendInvitations}
          disabled={
            loading ||
            emails.filter((email) => email && isValidEmail(email)).length === 0
          }
        >
          {loading ? "Sending..." : "Send Invitations"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteParticipantsDialog;
