import { useAuth } from '../../context/AuthContext';

function PrivateRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  return children;
}

export default PrivateRoute;