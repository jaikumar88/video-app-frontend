import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { RootState } from "../../store/store";
import { logout } from "../../store/slices/authSlice";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
    navigate("/");
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            WorldClass Video
          </Typography>

          {isAuthenticated ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button
                color="inherit"
                component={Link}
                to="/dashboard"
                sx={{ mr: 2 }}
              >
                Dashboard
              </Button>

              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                {user?.avatar_url ? (
                  <Avatar
                    src={user.avatar_url}
                    alt={user.first_name}
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <AccountCircleIcon />
                )}
              </IconButton>

              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleClose}>
                  <AccountCircleIcon sx={{ mr: 1 }} />
                  Profile
                </MenuItem>
                {user?.is_superuser && (
                  <MenuItem component={Link} to="/admin" onClick={handleClose}>
                    <AdminIcon sx={{ mr: 1 }} />
                    Admin Panel
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box>
              <Button
                color="inherit"
                component={Link}
                to="/join"
                sx={{ mr: 1 }}
              >
                Join as Guest
              </Button>
              <Button
                color="inherit"
                component={Link}
                to="/login"
                sx={{ mr: 1 }}
              >
                Sign In
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                component={Link}
                to="/register"
              >
                Sign Up
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <main>{children}</main>
    </Box>
  );
};

export default Layout;
