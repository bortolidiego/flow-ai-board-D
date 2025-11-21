import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatwootAuthHandler } from "./components/ChatwootAuthHandler";
import { ProvisionGate } from "./components/ProvisionGate";
import { ChatwootContextProvider } from "./components/ChatwootContextProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import KanbanBoard from "./pages/KanbanBoard";
import Brain from "./pages/Brain";
import BrainNew from "./pages/BrainNew";
import Changelog from "./pages/Changelog";
import Auth from "./pages/Auth";
import AcceptInvite from "./pages/AcceptInvite";
import UpdatePassword from "./pages/UpdatePassword";
import Profile from "./pages/Profile";
import ProvisionWrapper from "./components/ProvisionWrapper";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors or network errors
        if (error?.message?.includes('JWT') || error?.message?.includes('fetch')) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ChatwootContextProvider>
          <ChatwootAuthHandler>
            <ProvisionGate>
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
            </ProvisionGate>
          </ChatwootAuthHandler>
        </ChatwootContextProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;