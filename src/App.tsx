import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatwootAuthHandler } from "./components/ChatwootAuthHandler";
import KanbanBoard from "./pages/KanbanBoard";
import Brain from "./pages/Brain";
import BrainNew from "./pages/BrainNew";
import Changelog from "./pages/Changelog";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import UpdatePassword from "./pages/UpdatePassword";
import Profile from "./pages/Profile"; // Importar nova página
import ProvisionWrapper from "./components/ProvisionWrapper";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ChatwootAuthHandler>
        <HashRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/provision" element={<ProvisionWrapper />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <KanbanBoard />
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

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </ChatwootAuthHandler>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;