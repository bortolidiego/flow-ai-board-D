import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Brain from "./pages/Brain";
import BrainNew from "./pages/BrainNew";
import Changelog from "./pages/Changelog";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import ProvisionWrapper from "./components/ProvisionWrapper";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/provision" element={<ProvisionWrapper />} />
          
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
                  <Brain />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/brain/new"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout>
                  <BrainNew />
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
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;