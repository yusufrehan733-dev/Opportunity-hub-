import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-2xl font-bold text-foreground">
            Admin Panel
          </h1>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-card border rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">
            Admin Dashboard
          </h2>

          <p className="text-muted-foreground mb-6">
            Manage users, leads, and system settings.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
