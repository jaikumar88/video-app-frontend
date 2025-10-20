import React from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8 }}>
        {/* Hero Section */}
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" component="h1" gutterBottom>
            WorldClass Video Platform
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Connect with anyone, anywhere. Experience crystal-clear video calls
            with advanced features designed for the modern world.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/register"
              sx={{ mr: 2 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/login"
              sx={{ mr: 2 }}
            >
              Sign In
            </Button>
            <Button variant="text" size="large" component={Link} to="/join">
              Join as Guest
            </Button>
          </Box>
        </Box>

        {/* Features Section */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center" }}>
              <CardContent>
                <VideoCallIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h6" component="h3" gutterBottom>
                  HD Video Calls
                </Typography>
                <Typography color="text.secondary">
                  Crystal-clear video quality with adaptive streaming for
                  optimal performance on any device.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center" }}>
              <CardContent>
                <PeopleIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h6" component="h3" gutterBottom>
                  Multi-Party Meetings
                </Typography>
                <Typography color="text.secondary">
                  Host meetings with up to 1000 participants with advanced
                  moderation and screen sharing features.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center" }}>
              <CardContent>
                <SecurityIcon
                  sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h6" component="h3" gutterBottom>
                  Enterprise Security
                </Typography>
                <Typography color="text.secondary">
                  End-to-end encryption, secure authentication, and compliance
                  with global security standards.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage;
