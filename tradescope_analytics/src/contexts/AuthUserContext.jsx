import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService } from '../services/authService'; 

const AuthContext = createContext({});

// =================================================================
// 1. EXPORTED HOOK (This was the missing piece causing the error)
// =================================================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// =================================================================
// 2. AUTH PROVIDER
// =================================================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Function to load the user profile (TEMPORARILY MODIFIED)
  // Stable dependency []. Assumes profile data is in the user object for now.
  const loadUserProfile = useCallback(async (userData) => {
    if (!userData) return;
    setProfileLoading(true);
    try {
        // TEMPORARY FIX: Assume profile data is included in the user object
        setUserProfile(userData); 
    } catch (error) {
        console.error('Profile load error:', error);
    } finally {
        setProfileLoading(false);
    }
  }, []); 

  // Core function to check the session state by calling the backend
  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await AuthService.getCurrentUser();
      
      setUser(userData);
      // Pass the fetched data directly to loadUserProfile
      loadUserProfile(userData); 

    } catch (error) {
      // Session failed (401)
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]); // loadUserProfile is stable, so checkSession is stable

  useEffect(() => {
    // Initial session check when the component mounts
    checkSession();
  }, [checkSession]);

  // Auth methods (placeholders for custom backend)
  const signIn = async (email, password) => {
    console.error("Manual signIn not implemented.");
    return { error: { message: 'Manual login not supported yet.' } };
  };

  const signUp = async (email, password, metadata = {}) => {
    console.error("Manual signUp not implemented.");
    return { error: { message: 'Registration not supported yet.' } };
  };

  const signOut = async () => {
    try {
      const { error } = await AuthService.signOut();
      if (!error) {
        setUser(null);
        setUserProfile(null);
      }
      return { error };
    } catch (error) {
      return { error: { message: 'Network error during sign out. Please try again.' } };
    }
  };

  const updateProfile = async (updates) => {
    console.error("Profile update not implemented for custom backend.");
    return { error: { message: 'Profile update not supported yet.' } };
  };

  const resetPassword = async (email) => {
    console.error("Password reset not implemented for custom backend.");
    return { error: { message: 'Password reset not supported yet.' } };
  };

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    isAuthenticated: !!user,
    getCurrentUserId: () => user?.id?.toString() || null,
    checkSession 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};