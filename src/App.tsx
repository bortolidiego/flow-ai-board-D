import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider"; // Caminho corrigido
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WorkspaceProvider } from "@/hooks/useWorkspace"; // Importar WorkspaceProvider

import Index from "@/pages/Index";
import Login from "@/pages/Login";
import BrainPage from "@/pages/Brain";
import Changelog from "@/pages/Changelog";
import AcceptInvite from "@/pages/AcceptInvite";
import Provision from "@/pages/Provision";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/auth" element={<Login />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/provision" element={<Provision />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <WorkspaceProvider> {/* Envolver a rota com WorkspaceProvider */}
                    <AppLayout>
                      <Index />
                    </AppLayout>
                  </WorkspaceProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brain"
              element={
                <ProtectedRoute requireAdmin>
                  <WorkspaceProvider> {/* Envolver a rota com WorkspaceProvider */}
                    <AppLayout>
                      <BrainPage />
                    </AppLayout>
                  </WorkspaceProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/changelog"
              element={
                <ProtectedRoute>
                  <WorkspaceProvider> {/* Envolver a rota com WorkspaceProvider */}
                    <AppLayout>
                      <Changelog />
                    </AppLayout>
                  </WorkspaceProvider>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;