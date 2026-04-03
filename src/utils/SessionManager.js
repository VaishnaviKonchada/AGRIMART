/**
 * Session Manager Utility
 * Handles persistent session across page refreshes and navigation
 * Stores and validates authentication state with minimal validation
 */

// Static instance for tracking monitoring state
let monitoringInstance = null;
let lastValidationLog = 0;

class SessionManager {
  constructor() {
    this.SESSION_CHECK_INTERVAL = 1000; // Check every 1 second
    this.isSessionCheckRunning = false;
    this.VALIDATION_LOG_INTERVAL = 5000; // Log every 5 seconds max
    this.isSavingInProgress = false; // Flag to prevent race conditions during login
  }

  /**
   * Get current user session (reads from localStorage)
   * Returns session even if validation fails - let API handle auth
   * @returns {object|null} - User object or null
   */
  static getSession() {
    try {
      const user = localStorage.getItem('registeredUser');
      const token = localStorage.getItem('accessToken');
      const role = localStorage.getItem('userRole');
      
      // ALL three must exist
      if (!user || !token || !role) {
        return null;
      }

      // Try to parse user - if fails, session is corrupted
      let parsedUser;
      try {
        parsedUser = JSON.parse(user);
      } catch (parseError) {
        console.error('❌ CORRUPTED USER DATA in localStorage - clearing session');
        SessionManager.clearSession();
        return null;
      }

      // Return session object - validation happens separately
      return {
        user: parsedUser,
        token: token,
        role: role
      };
    } catch (error) {
      console.error('❌ Error reading session:', error.message);
      return null;
    }
  }

  /**
   * Save session (after login)
   * Atomically saves all session data OR none at all
   * @param {object} userData - User object from backend
   * @param {string} token - JWT token from backend
   */
  static saveSession(userData, token) {
    try {
      if (!userData || !token) {
        console.error('❌ Cannot save session - missing userData or token');
        return false;
      }

      // Signal for monitoring to pause clearing
      if (monitoringInstance) monitoringInstance.isSavingInProgress = true;
      
      // Clear stale data first
      SessionManager.clearSession();
      
      localStorage.setItem('accessToken', token);
      localStorage.setItem('authToken', token); // Backup
      localStorage.setItem('registeredUser', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('sessionStartTime', new Date().toISOString());
      localStorage.setItem('sessionValid', 'true');
      
      // End signal
      if (monitoringInstance) monitoringInstance.isSavingInProgress = false;

      console.log(`✅ Session saved successfully for: ${userData.name}`);
      return true;
    } catch (error) {
      if (monitoringInstance) monitoringInstance.isSavingInProgress = false;
      console.error('❌ Error saving session:', error.message);
      return false;
    }
  }

  /**
   * Clear all session data (on logout)
   */
  static clearSession() {
    const keysToRemove = [
      'accessToken',
      'authToken',
      'registeredUser',
      'userRole',
      'farmerProfile',
      'dealerProfile',
      'adminProfile',
      'customerProfile',
      'sessionStartTime',
      'selectedCrop',
      'currentTransportOrder'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Session cleared');
  }

  /**
   * Verify session is still valid (minimal checks)
   * This is lenient - detailed validation happens on API calls (backend validates token)
   * @returns {boolean} - true if session appears valid (user + token exist)
   */
  static isSessionValid() {
    const session = SessionManager.getSession();
    
    // If no session at all, definitely not valid
    if (!session) {
      return false;
    }

    // If we have user + token + role, consider it valid for client-side routing
    // Server will validate token on actual API calls
      // If we have user + token + role, consider it valid for client-side routing
      // Server will validate token on actual API calls
      if (session.user && session.token && session.role) {
        // Try basic token format check (JWTs have 3 parts separated by dots)
        const parts = session.token.split('.');
        
        // If it looks like a JWT, check its expiry
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp) {
              const expTime = payload.exp * 1000;
              const now = Date.now();
              
              if (expTime < now) {
                console.warn('⚠️ Token is expired - session invalid');
                return false;
              }
              
              // Log expiry only once every 5 seconds to avoid log spam
              const now_time = Date.now();
              if (now_time - lastValidationLog > 5000) {
                const minutesLeft = Math.round((expTime - now) / 60000);
                console.log(`✅ Session valid (${minutesLeft}m left)`);
                lastValidationLog = now_time;
              }
            }
          } catch (error) {
            // Can't decode token payload, but it's okay - backend will validate it
            console.log('✅ Session appears valid (token payload is unreadable)');
          }
        } else {
          // It's a non-JWT token, but we still consider it valid as a base token
          // Backend will validate it on the next API request
          const now_time = Date.now();
          if (now_time - lastValidationLog > 5000) {
            console.log('✅ Session valid (simple token format)');
            lastValidationLog = now_time;
          }
        }

        return true;
      }

    return false;
  }

  /**
   * Initialize session monitoring
   * Checks periodically if session is still valid
   * Only clears session if token is actually expired
   */
  static startSessionMonitoring() {
    if (!monitoringInstance) {
      monitoringInstance = new SessionManager();
    }

    if (monitoringInstance.isSessionCheckRunning) {
      return; // Already running
    }

    monitoringInstance.isSessionCheckRunning = true;
    console.log('📊 Session monitoring started (checks every 1 second)');

    const monitoringInterval = setInterval(() => {
      try {
        // SKIP check if we are in the middle of saving a new session (prevents race condition)
        if (monitoringInstance.isSavingInProgress) return;

        const isValid = SessionManager.isSessionValid();
        if (!isValid) {
          // Double check to be sure (wait 500ms and check once more before clearing)
          setTimeout(() => {
            if (!SessionManager.isSessionValid() && !monitoringInstance.isSavingInProgress) {
              console.warn('⚠️ Session definitely invalid - clearing');
              SessionManager.clearSession();
            }
          }, 500);
        }
      } catch (error) {
        console.error('❌ Error during session monitoring:', error.message);
      }
    }, monitoringInstance.SESSION_CHECK_INTERVAL);
  }
}

export default SessionManager;
