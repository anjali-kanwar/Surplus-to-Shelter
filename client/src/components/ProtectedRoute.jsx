import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { getToken, decodeToken, logout, getRoleHomeRoute } from '../utils/auth';

/**
 * ProtectedRoute component
 * Reads JWT from localStorage, decodes role, and only renders children if role matches requiredRole.
 *
 * @param {string} [requiredRole] - Required role (e.g. 'donor', 'rescuer', 'admin')
 * @param {string} [role] - Alternate prop for required role
 * @param {string[]} [allowedRoles] - Optional list of allowed roles
 * @param {React.ReactNode} [children] - Component to render if authorized
 */
const ProtectedRoute = ({ requiredRole, role, allowedRoles, children }) => {
  const location = useLocation();
  const token = getToken();

  // If unauthenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const decoded = decodeToken(token);

  // If token decoding fails or token is expired
  if (!decoded || (decoded.exp && Date.now() >= decoded.exp * 1000)) {
    logout();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = decoded.role;
  const targetRoles = allowedRoles || (requiredRole ? [requiredRole] : role ? [role] : []);

  // If role does not match required role, redirect to authorized dashboard
  if (targetRoles.length > 0 && !targetRoles.includes(userRole)) {
    const fallbackRoute = getRoleHomeRoute(userRole);
    return <Navigate to={fallbackRoute} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
