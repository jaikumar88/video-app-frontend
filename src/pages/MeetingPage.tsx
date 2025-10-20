import React from "react";
import { Container, Typography, Box } from "@mui/material";
import FullMeetingRoom from "../components/FullMeetingRoom";

const MeetingPage: React.FC = () => {
  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <FullMeetingRoom />
      </Box>
    </Container>
  );
};

export default MeetingPage;
