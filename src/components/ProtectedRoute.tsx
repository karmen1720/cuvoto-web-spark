import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceCheck } from "@/hooks/useDeviceCheck";
import { Droplets, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireDevice?: boolean;
}

const ProtectedRoute = ({ children, requireDevice = false }: ProtectedRouteProps) => {
  const { session, loading: authLoading } = useAuth();
  const { hasDevices, loading: deviceLoading } = useDeviceCheck();

  if (authLoading || (session && requireDevice && deviceLoading)) {
    return (
      <div className="min-h-screen bg-cuvoto-gradient flex flex-col items-center justify-center gap-4 dark">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
          <Droplets className="w-8 h-8 text-primary-foreground" />
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // If route requires a device and user has none, redirect to register
  if (requireDevice && !hasDevices) {
    return <Navigate to="/register-device" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
