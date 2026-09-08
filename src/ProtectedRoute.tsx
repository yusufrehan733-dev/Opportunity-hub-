import { Navigate, Outlet } from "react-router-dom";
import { useAuthMe } from "./hook/use-auth";

export default function ProtectedRoute() {
  const { data: user, isLoading } = useAuthMe();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
