// src/services/authService.js

// Ensure you have configured VITE_API_URL in your .env.development file
const API_URL = import.meta.env.VITE_API_URL;

const fetchConfig = {
    headers: {
        'Content-Type': 'application/json',
    },
    // CRITICAL: This ensures the session cookie is sent to and received from the backend
    credentials: 'include', 
};

/**
 * Authentication Service for TradeScope using a Custom Backend (Express/Passport/Prisma).
 * All methods communicate with custom API endpoints instead of Supabase client methods.
 */
export class AuthService {

    // ===================================================
    // Core Session Management (Required for OAuth Flow)
    // ===================================================

    /**
     * Checks the backend session to get the currently logged-in user.
     * Hits the Express endpoint: GET /api/user/me
     * @returns {Object} The user object if authenticated.
     * @throws {Error} If session is invalid (e.g., 401 Unauthorized).
     */
    static async getCurrentUser() {
        try {
            const response = await fetch(`${API_URL}/api/user/me`, {
                method: 'GET',
                ...fetchConfig,
            });

            if (!response.ok) {
                // This error is caught by AuthContext, signaling the user is logged out
                throw new Error('Not Authenticated or Session Expired');
            }
            
            // Return the user data (Prisma User object) from the backend
            return await response.json(); 
        } catch (error) {
            console.warn("AuthService: getCurrentUser failed (expected during logout/expired session).", error.message);
            throw error;
        }
    }

    /**
     * Clears the session cookie on the backend.
     * Hits the Express endpoint: POST /auth/logout
     * @returns {{success: boolean, error: string|null}}
     */
    static async logoutUser() {
        try {
            const response = await fetch(`${API_URL}/auth/logout`, {
                method: 'POST', 
                ...fetchConfig,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Logout failed on the server side.');
            }
            
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error: error?.message || 'Something went wrong during logout.' };
        }
    }

    // Alias signOut to logoutUser for consistency
    static async signOut() {
        return AuthService.logoutUser();
    }


    // ===================================================
    // Placeholder Methods (Need Custom Backend Implementation)
    // ===================================================

    static async signUp(email, password, userData = {}) {
        console.error("AuthService: signUp requires a custom backend endpoint: POST /auth/register");
        return { success: false, error: 'Registration not yet integrated with custom backend.' };
    }

    static async signIn(email, password) {
        console.error("AuthService: signIn requires a custom backend endpoint: POST /auth/login");
        return { success: false, error: 'Email/Password login not yet integrated with custom backend.' };
    }
    
    // OAuth sign in is handled by direct frontend redirect to /auth/google, 
    // so this method is no longer used for Google.
    static async signInWithProvider(provider) {
        console.warn(`AuthService: signInWithProvider for ${provider} is not required for Google OAuth. Use direct redirect instead.`);
        return { success: false, error: 'OAuth handled via direct redirect.' };
    }

    // The following methods all require custom Express routes interacting with Prisma:
    static async getCurrentSession() {
        console.error("AuthService: getCurrentSession should be replaced by getCurrentUser.");
        return { success: false, session: null, error: 'Replaced by getCurrentUser' };
    }
    
    static async getCurrentUserProfile() {
        console.error("AuthService: getCurrentUserProfile requires a custom backend endpoint.");
        return { success: false, profile: null, error: 'User profile fetching requires custom API.' };
    }

    static async updateProfile(updates) {
        console.error("AuthService: updateProfile requires a custom backend endpoint.");
        return { success: false, error: 'Profile update requires custom API.' };
    }

    static async resetPassword(email) {
        console.error("AuthService: resetPassword requires a custom backend endpoint.");
        return { success: false, error: 'Password reset requires custom API.' };
    }

    static async updatePassword(newPassword) {
        console.error("AuthService: updatePassword requires a custom backend endpoint.");
        return { success: false, error: 'Password update requires custom API.' };
    }
}

export default AuthService;