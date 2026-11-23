import { createContext, useContext } from 'react';

// Who is logged in and what they may do. Filled in by Layout from GET /api/me.
export const AccessContext = createContext({ role: null, isAdmin: false, me: null });
export const useAccess = () => useContext(AccessContext);

// Pages a till operator (cashier) may open. Everything else is admin only.
// The backend enforces the same rules (backend/lib/auth.js).
export const TILL_PATHS = ['/sell', '/products', '/customers', '/orders', '/help'];
export const tillMayOpen = (path) => TILL_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
