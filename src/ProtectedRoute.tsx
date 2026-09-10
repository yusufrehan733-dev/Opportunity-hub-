import { Navigate, Outlet } from "react-router-dom";
import { useAuthUser } from "./hook/use-auth";
import { useTrialStatus } from "./hooks/use-trial-status";

export default function ProtectedRoute() {
  const { data: user, isLoading: userLoading } = useAuthUser();
  const { data: trial, isLoading: trialLoading } = useTrialStatus();

  if (userLoading || trialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!trial?.active) {
    return <Navigate to="/login?expired=true" replace />;
  }

  return <Outlet />;
}
