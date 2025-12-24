import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth";
import { TopBar } from "@/components/TopBar";
import { HomePage } from "@/pages/HomePage";
import { DashboardConfigDialog } from "@/components/DashboardConfigDialog";

function App() {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  return (
    <AuthProvider>
      <ProtectedRoute appName="Pulsar">
        <div className="min-h-screen bg-background">
          <TopBar onOpenConfig={() => setConfigDialogOpen(true)} />
          <HomePage />
          <DashboardConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
          />
          <Toaster position="bottom-right" richColors />
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
