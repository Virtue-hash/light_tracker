import React from 'react';
import App from './App';
import AdminDashboard from './AdminDashboard';

/**
 * Root
 *
 * Plain path-based switch -- no router library needed for just two
 * screens. Visiting /admin (or anything starting with /admin, like
 * /admin/) shows AdminDashboard; every other path shows the regular App.
 *
 * Note: this only checks the path once, on load. If you later want
 * clicking a link to switch between them without a full page refresh,
 * swap this for react-router (createBrowserRouter) -- ask and I can
 * wire that up too.
 */
export default function Root() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  return isAdmin ? <AdminDashboard /> : <App />;
}
