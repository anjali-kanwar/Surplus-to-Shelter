/**
 * Decodes a JWT token without requiring external dependencies
 * @param {string} token - Base64 encoded JWT string
 * @returns {object|null} Decoded JSON payload or null
 */
export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode JWT token:', err);
    return null;
  }
};

/**
 * Returns stored JWT token from localStorage
 */
export const getToken = () => {
  return localStorage.getItem('token') || null;
};

/**
 * Returns stored or decoded user object
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
  } catch (err) {
    // ignore
  }
  const decoded = decodeToken(getToken());
  return decoded;
};

/**
 * Returns the role from decoded JWT token
 */
export const getUserRole = () => {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded) return null;

  // Check token expiration if present
  if (decoded.exp && Date.now() >= decoded.exp * 1000) {
    logout();
    return null;
  }

  return decoded.role || null;
};

/**
 * Store auth session
 */
export const setAuthSession = (token, user = null) => {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Remove auth session
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Returns default dashboard route for a given role
 */
export const getRoleHomeRoute = (role) => {
  switch (role) {
    case 'donor':
      return '/donor';
    case 'rescuer':
      return '/rescuer';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
};
