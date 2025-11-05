// src/pages/AuthCallback.jsx
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../components/contexts/AuthUserContext";
// You might want to import a notification system here if you have one
// import { useNotificationCenter } from '../components/ui/NotificationCenter';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSession } = useAuth();
  // const { notify } = useNotificationCenter(); // If using a notification system

  useEffect(() => {
    const status = searchParams.get("status");

    if (status === "success") {
      // The backend signaled success; now ask AuthContext to verify the session cookie
      checkSession()
        .then(() => {
          // Success: Cookie validated, user data loaded into context
          // notify({ title: 'Login Successful', type: 'success' });
          navigate("/dashboard", { replace: true });
        })
        .catch(() => {
          // Failure: Could not validate session (e.g., cookie issue)
          // notify({ title: 'Authentication Failed', description: 'Could not establish session.', type: 'error' });
          navigate("/login?error=session_failed", { replace: true });
        });
    } else if (status === "failure") {
      // Authentication failed on the server side (e.g., Google rejected login)
      // notify({ title: 'Login Failed', description: 'Google authentication failed.', type: 'error' });
      navigate("/login?error=oauth_failed", { replace: true });
    } else {
      // Unexpected access, redirect to login
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate, checkSession]);

  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <div className="text-center p-6 rounded-lg">
        <h1 className="text-xl font-semibold text-primary">
          Securing Session...
        </h1>
        <p className="text-muted-foreground mt-2">
          Redirecting you to the TradeScope dashboard.
        </p>
        {/* Optional: Add a spinner component here */}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
