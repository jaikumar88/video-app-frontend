import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Pagination,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Delete,
  Edit,
  Verified,
  Cancel,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";

interface User {
  id: string;
  email?: string;
  phone_number?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  email_verified: boolean;
  phone_verified: boolean;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login?: string;
}

interface AdminStats {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
}

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user: currentUser } = useSelector(
    (state: RootState) => state.auth
  );

  // Check if user is admin
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (!currentUser?.is_superuser) {
      navigate("/dashboard");
      return;
    }
  }, [token, currentUser, navigate]);

  // Fetch admin stats
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/v1/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/v1/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        // Calculate total pages (assuming 10 per page)
        setTotalPages(Math.ceil(data.length / 10));
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setSuccess("User updated successfully");
        fetchUsers();
        setEditDialogOpen(false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to update user");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess("User deleted successfully");
        fetchUsers();
        fetchStats();
        setDeleteDialogOpen(false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to delete user");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  // Verify user email
  const verifyUserEmail = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/v1/admin/users/${userId}/verify-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setSuccess("User email verified successfully");
        fetchUsers();
      } else {
        setError("Failed to verify user email");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  useEffect(() => {
    if (token && currentUser?.is_superuser) {
      fetchStats();
      fetchUsers();
    }
  }, [token, currentUser, page]);

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (token && currentUser?.is_superuser) {
        setPage(1);
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!currentUser?.is_superuser) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h5">{stats.total_users}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Verified Users
                </Typography>
                <Typography variant="h5" color="success.main">
                  {stats.verified_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unverified Users
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {stats.unverified_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h5" color="primary">
                  {stats.active_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Inactive Users
                </Typography>
                <Typography variant="h5" color="error">
                  {stats.inactive_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Admin Users
                </Typography>
                <Typography variant="h5" color="secondary">
                  {stats.admin_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Verification</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone_number}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? "Active" : "Inactive"}
                      color={user.is_active ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {user.email_verified && (
                        <Chip label="Email" color="success" size="small" />
                      )}
                      {user.phone_verified && (
                        <Chip label="Phone" color="success" size="small" />
                      )}
                      {!user.email_verified && !user.phone_verified && (
                        <Chip label="None" color="error" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.is_superuser && (
                      <Chip
                        label="Admin"
                        color="secondary"
                        size="small"
                        icon={<AdminPanelSettings />}
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Edit User">
                        <IconButton
                          onClick={() => handleEditUser(user)}
                          size="small"
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {!user.email_verified && user.email && (
                        <Tooltip title="Verify Email">
                          <IconButton
                            onClick={() => verifyUserEmail(user.id)}
                            size="small"
                            color="success"
                          >
                            <Verified />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete User">
                        <IconButton
                          onClick={() => handleDeleteUser(user)}
                          size="small"
                          color="error"
                          disabled={user.id === currentUser.id}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
          />
        </Box>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>
                {selectedUser.first_name} {selectedUser.last_name}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser.email_verified}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        email_verified: e.target.checked,
                      })
                    }
                  />
                }
                label="Email Verified"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser.phone_verified}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        phone_verified: e.target.checked,
                      })
                    }
                  />
                }
                label="Phone Verified"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser.is_active}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        is_active: e.target.checked,
                      })
                    }
                  />
                }
                label="Account Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser.is_superuser}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        is_superuser: e.target.checked,
                      })
                    }
                    disabled={selectedUser.id === currentUser.id}
                  />
                }
                label="Admin User"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() =>
              selectedUser &&
              updateUser(selectedUser.id, {
                email_verified: selectedUser.email_verified,
                phone_verified: selectedUser.phone_verified,
                is_active: selectedUser.is_active,
                is_superuser: selectedUser.is_superuser,
              })
            }
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user{" "}
            <strong>
              {selectedUser?.first_name} {selectedUser?.last_name}
            </strong>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => selectedUser && deleteUser(selectedUser.id)}
            variant="contained"
            color="error"
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPage;
