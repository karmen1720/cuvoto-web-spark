import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import cuvotoLogo from "@/assets/cuvoto-logo.jpeg";

const NotFound = () => (
  <div className="min-h-screen bg-cuvoto-gradient bg-dashboard-glow text-foreground dark flex items-center justify-center px-6">
    <div className="text-center max-w-sm">
      <img src={cuvotoLogo} alt="CUVOTO" className="w-14 h-14 mx-auto mb-5 rounded-2xl object-contain bg-card" />
      <h1 className="text-5xl font-extrabold text-gradient-cuvoto mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page doesn't exist.</p>
      <Link
        to="/auth"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
      >
        <Home className="w-4 h-4" /> Go to CUVOTO
      </Link>
    </div>
  </div>
);

export default NotFound;
