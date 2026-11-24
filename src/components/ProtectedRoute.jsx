import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isManager } from '../utils/roles';
import PageLoader from './PageLoader';

// Renders the page only for a logged-in user; otherwise sends them to /login
export const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Pages only admins, managers and team leads can open
export const ManagerRoute = ({ children }) => {
  const { user } = useAuth();
  if (!isManager(user)) return <Navigate to="/" replace />;
  return children;
};

// Picks a page by role
export const RoleSwitch = ({ manager, employee }) => {
  const { user } = useAuth();
  return isManager(user) ? manager : employee;
};

export default ProtectedRoute;
