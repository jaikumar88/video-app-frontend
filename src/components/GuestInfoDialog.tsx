import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from "@mui/material";

interface GuestInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (guestInfo: { name: string; email?: string }) => void;
}

const GuestInfoDialog: React.FC<GuestInfoDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; email?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    // Basic email validation if provided
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const guestInfo: { name: string; email?: string } = {
      name: name.trim(),
    };

    if (email.trim()) {
      guestInfo.email = email.trim();
    }

    onSubmit(guestInfo);
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Join Meeting as Guest</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please provide your information to join the meeting.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              autoFocus
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
              fullWidth
            />

            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email || "Optional - you can leave this blank"}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Join Meeting
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GuestInfoDialog;
