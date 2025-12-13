import { useState } from "react";
import { Toaster } from "sonner";
import { TopBar } from "@/components/TopBar";
import { HomePage } from "@/pages/HomePage";
import { DashboardConfigDialog } from "@/components/DashboardConfigDialog";

function App() {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <TopBar onOpenConfig={() => setConfigDialogOpen(true)} />
      <HomePage />
      <DashboardConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
