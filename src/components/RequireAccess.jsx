import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canAccess, firstAllowedPath } from '../utils/access';

// Guards a page: only renders if the logged-in user has access to `pageKey`,
// otherwise sends them to their first allowed page (or login if none).
const RequireAccess = ({ pageKey, children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  if (!canAccess(user, pageKey)) {
    const dest = firstAllowedPath(user);
    if (!dest) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
          <p className="text-lg font-bold text-slate-700">No page access assigned</p>
          <p className="text-sm mt-1">Please contact the administrator to get access.</p>
        </div>
      );
    }
    return <Navigate to={dest} replace />;
  }

  return children;
};

export default RequireAccess;

// Redirects the index route ("/") to the user's first allowed page.
export const HomeRedirect = () => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  const dest = firstAllowedPath(user);
  return dest ? <Navigate to={dest} replace /> : (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
      <p className="text-lg font-bold text-slate-700">No page access assigned</p>
      <p className="text-sm mt-1">Please contact the administrator to get access.</p>
    </div>
  );
};
