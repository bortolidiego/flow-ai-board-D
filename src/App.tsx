import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
    import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
    import { Toaster } from "@/components/ui/sonner";
    import { ThemeProvider } from "@/components/theme-provider";
    import { AppLayout } from "@/components/AppLayout";
    import { ProtectedRoute } from "@/components/ProtectedRoute";
    import { WorkspaceProvider } from "@/hooks/useWorkspace"; // Importar WorkspaceProvider

    import Index from "@/pages/Index";
    import Login from "@/pages/Login";
    import BrainPage from "@/pages/Brain"; // Importar BrainPage
    import Changelog from "@/pages/Changelog";
    import AcceptInvite from "@/pages/AcceptInvite";
    import Provision from "@/pages/Provision";

    const queryClient = new QueryClient();

    function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <WorkspaceProvider> {/* Envolver a aplicação com WorkspaceProvider */}
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
                        <AppLayout>
                          <Index />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/brain"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AppLayout>
                          <BrainPage />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/changelog"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Changelog />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </WorkspaceProvider>
          </ThemeProvider>
        </QueryClientProvider>
      );
    }

    export default App;