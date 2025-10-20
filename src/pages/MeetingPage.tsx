import React from "react";
import { Container, Box } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import FullMeetingRoom from "../components/FullMeetingRoom";

const MeetingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("token");

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <FullMeetingRoom invitationToken={invitationToken} />
      </Box>
    </Container>
  );
};

export default MeetingPage;
