/**
 * Global API Utility
 * Handles all API calls with automatic 401 (token expiration) handling
 * Automatically redirects to login when session expires
 */

import SessionManager from './SessionManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://agrimartbackend.vercel.app/api";

/**
 * Make an API call with automatic authentication and error handling
 * @param {string} endpoint - API endpoint (e.g., "/crops" or "crops")
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise} - Response data or throws error
 */
export async function apiCall(endpoint, options = {}) {
  // Normalize endpoint (remove leading slash if present)
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint.substring(1) : endpoint;
  const url = `${API_BASE_URL}/${normalizedEndpoint}`;

  // Get auth token using SessionManager
  const session = SessionManager.getSession();
  const token = session?.token;

  // Merge default headers with provided headers
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Prepare fetch options
  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    console.log(`🌐 API Call: ${options.method || "GET"} ${url}`);
    const response = await fetch(url, fetchOptions);

    // Handle 401 Unauthorized (Token expired or invalid)
    if (response.status === 401) {
      console.error("❌ 401 Unauthorized: Token expired or invalid");
      console.log("🧹 Clearing session and redirecting to login...");
      
      // Clear session using SessionManager
      SessionManager.clearSession();
      
      // Alert user (optional - remove if you want silent redirect)
      alert("Your session has expired. Please login again.");
      
      // Redirect to login page
      window.location.assign("/login");
      
      // Throw error to stop execution
      throw new Error("Session expired. Redirecting to login...");
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP Error ${response.status}`;
      console.error(`❌ API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Parse and return response data
    const data = await response.json();
    console.log(`✅ API Success: ${options.method || "GET"} ${url}`);
    return data;

  } catch (error) {
    // If error is due to network or parsing, log it
    if (error.message !== "Session expired. Redirecting to login...") {
      console.error("❌ API Call Failed:", error.message);
    }
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint) {
  return apiCall(endpoint, { method: "GET" });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(endpoint, body) {
  return apiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(endpoint, body) {
  return apiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint) {
  return apiCall(endpoint, { method: "DELETE" });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch(endpoint, body) {
  return apiCall(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Export base URL for direct access if needed
export { API_BASE_URL };
