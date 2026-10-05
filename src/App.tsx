import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import TanksPage from "./pages/TanksPage";
import AlertsPage from "./pages/AlertsPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterDevicePage from "./pages/RegisterDevicePage";
import DeviceSetupPage from "./pages/DeviceSetupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/register-device" element={<ProtectedRoute><RegisterDevicePage /></ProtectedRoute>} />
            <Route path="/device-setup" element={<ProtectedRoute><DeviceSetupPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute requireDevice><DashboardPage /></ProtectedRoute>} />
            <Route path="/tanks" element={<ProtectedRoute requireDevice><TanksPage /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute requireDevice><AlertsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/index" element={<Navigate to="/auth" replace />} />
            <Route path="/index.html" element={<Navigate to="/auth" replace />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
