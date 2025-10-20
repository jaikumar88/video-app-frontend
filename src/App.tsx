import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { RootState } from "./store/store";
import Layout from "./components/Layout/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import MeetingPage from "./pages/MeetingPage";
import JoinByCodePage from "./pages/JoinByCodePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Meeting Route Component (allows guest access with invitation token or guest session)
const MeetingRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const urlParams = new URLSearchParams(window.location.search);
  const hasInvitationToken = urlParams.has("token");

  // Check if user has a guest session (stored when they successfully join as guest)
  const hasGuestSession = sessionStorage.getItem("guestMeetingAccess") !== null;

  // If authenticated, allow access
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated but has invitation token, allow access
  if (hasInvitationToken) {
    return <>{children}</>;
  }

  // If not authenticated but has guest session, allow access
  if (hasGuestSession) {
    return <>{children}</>;
  }

  // If not authenticated and no invitation token or guest session, redirect to login with return URL
  const returnUrl = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return !isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

const App: React.FC = () => {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Layout>
                <LoginPage />
              </Layout>
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Layout>
                <RegisterPage />
              </Layout>
            </PublicRoute>
          }
        />

        <Route
          path="/verify-email"
          element={
            <Layout>
              <VerifyEmailPage />
            </Layout>
          }
        />

        <Route
          path="/join"
          element={
            <Layout>
              <JoinByCodePage />
            </Layout>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/meeting/:meetingId"
          element={
            <MeetingRoute>
              <MeetingPage />
            </MeetingRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <Layout>
              <NotFoundPage />
            </Layout>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
