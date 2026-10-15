import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceCheck } from "@/hooks/useDeviceCheck";
import { Droplets, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireDevice?: boolean;
}

const ProtectedRoute = ({ children, requireDevice = false }: ProtectedRouteProps) => {
  const { session, loading: authLoading } = useAuth();
  const { hasDevices, loading: deviceLoading, refetch } = useDeviceCheck();
  const location = useLocation();
  const justPaired = (location.state as any)?.justPaired === true;
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  // Refetch device status when arriving with justPaired flag
  useEffect(() => {
    if (justPaired) {
      refetch();
    }
  }, [justPaired, refetch]);

  // hasDevices === null means the device check hasn't run yet for this session —
  // treat it as loading so a page reload doesn't briefly redirect to /register-device.
  if (authLoading || (session && requireDevice && (deviceLoading || hasDevices === null))) {
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

  if (offline && requireDevice) {
    return <Navigate to="/local" replace />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // If route requires a device and user has none (and not just paired), redirect to register
  if (requireDevice && hasDevices === false && !justPaired) {
    return <Navigate to="/register-device" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
