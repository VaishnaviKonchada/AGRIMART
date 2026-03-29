import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import SessionManager from "../utils/SessionManager";

export default function RequireRole({ role, children }) {
  const [routeCheckResult, setRouteCheckResult] = useState(null);
  const [isCheckComplete, setIsCheckComplete] = useState(false);

  // Perform route check only once on mount
  useEffect(() => {
    // Start session monitoring on component mount
    SessionManager.startSessionMonitoring();
    
    // Perform initial route check
    performRouteCheck();

    // Don't re-check unless explicitly needed
  }, [role]); // Only re-check if role changes

  const performRouteCheck = () => {
    try {
      // Get session using SessionManager
      const session = SessionManager.getSession();
      const user = session?.user;
      const token = session?.token;
      
      const normalizedUserRole = (user?.role || "").toLowerCase().trim();
      const normalizedRequired = (role || "").toLowerCase().trim();
      
      // Handle dealer/transport dealer role equivalence
      const dealerVariants = ["dealer", "transport dealer"];
      const isDealer = dealerVariants.includes(normalizedUserRole);
      const requiresDealer = dealerVariants.includes(normalizedRequired);

      console.log(`🔍 ROUTE CHECK [${normalizedRequired}]:`, {
        hasUser: !!user,
        hasToken: !!token,
        userRole: normalizedUserRole,
        requiredRole: normalizedRequired,
        isDealerRoute: requiresDealer,
        isUserDealer: isDealer,
        userName: user?.name || 'N/A',
        status: !user ? "NO_LOGIN" : (requiresDealer && isDealer) || (normalizedUserRole === normalizedRequired) ? "✅ ALLOW" : "❌ DENY"
      });

      // NO USER OR NO TOKEN - redirect to login
      if (!user || !token) {
        console.log(`   → Action: Redirect to /login (not logged in)`);
        sessionStorage.setItem("intendedRole", normalizedRequired);
        setRouteCheckResult(<Navigate to="/login" replace />);
        setIsCheckComplete(true);
        return;
      }

      // SESSION EXISTS - Check role match
      const isDealerMatch = requiresDealer && isDealer;
      const isExactMatch = normalizedUserRole === normalizedRequired;
      const isRoleMatch = isDealerMatch || isExactMatch;

      if (!isRoleMatch) {
        console.log(`   → Action: Redirect to /login (role mismatch: ${normalizedUserRole} vs ${normalizedRequired})`);
        sessionStorage.setItem("intendedRole", normalizedRequired);
        setRouteCheckResult(<Navigate to="/login" replace />);
        setIsCheckComplete(true);
        return;
      }

      // ALL CHECKS PASSED - ALLOW ACCESS
      console.log(`   → Action: Allow access ✅`);
      setRouteCheckResult(null); // No redirect needed
      setIsCheckComplete(true);

    } catch (error) {
      console.error('❌ Error in route check:', error);
      // On error, allow access (better UX - let API handle final auth)
      setRouteCheckResult(null);
      setIsCheckComplete(true);
    }
  };

  // Show redirect if needed
  if (routeCheckResult) {
    return routeCheckResult;
  }

  // If check not complete, show nothing (prevents flash of content)
  if (!isCheckComplete) {
    return <div style={{display: 'none'}}>Checking access...</div>;
  }

  // Check passed - render children
  return children;
}

