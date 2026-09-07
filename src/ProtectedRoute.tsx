import { Navigate } from "react-router-dom";
import { useAuthMe } from "./hooks/use-auth";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { data: user, isLoading } = useAuthMe();

  // ⏳ While checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // ❌ Not logged in → redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in → allow access
  return children;
}
