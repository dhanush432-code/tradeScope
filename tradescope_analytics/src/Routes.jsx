import React from "react";
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";

// --- Context Imports (Only need useAuth here, as providers are in index.jsx) ---
import { useAuth } from "./contexts/AuthUserContext"; 

// --- Page Imports ---
import Dashboard from "./pages/dashboard";
import TradeManagement from "./pages/trade-management";
import Analytics from "./pages/analytics";
import BrokerIntegration from "./pages/broker-integration";
import ProfileSettings from "./pages/profile-settings";
import HelpSupport from "./pages/help-support";
import Security from "./pages/security";
import Notifications from "./pages/notifications";
import Login from "./pages/login";
import Register from "./pages/register";
import ForgotPassword from "./pages/forgot-password";
import PrivacyPolicy from "./pages/privacy-policy";
import TermsOfService from "./pages/terms-of-service";
import NotFound from "./pages/NotFound";
import AuthCallbackPage from "./pages/AuthCallback"; // OAuth Callback Page

// --- 1. Define the Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // If AuthContext is still determining the user status, wait.
  // NOTE: The visual loading state should be rendered in index.jsx by AuthProvider.
  if (loading) {
    return null; 
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page
    return <Navigate to="/login" replace />;
  }

  return children;
};
// --- End Protected Route Wrapper ---

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        {/* REMOVED: ThemeProvider and AuthProvider wrappers */}
        
        <ScrollToTop />
        <RouterRoutes>
          
          {/* ===================================================
             AUTHENTICATION & PUBLIC ROUTES
             =================================================== */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* CRITICAL: The OAuth Callback Route */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* LEGAL & SUPPORT ROUTES (Public) */}
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />

          {/* ===================================================
             PROTECTED APPLICATION ROUTES
             =================================================== */}

          {/* Root path redirects to Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* All main app routes are now wrapped in ProtectedRoute */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade-management"
            element={
              <ProtectedRoute>
                <TradeManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/broker-integration"
            element={
              <ProtectedRoute>
                <BrokerIntegration />
              </ProtectedRoute>
            }
          />

          {/* Protected User Management Routes */}
          <Route
            path="/profile-settings"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <Security />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* 404 Route (Stays public) */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
        
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRoutes;