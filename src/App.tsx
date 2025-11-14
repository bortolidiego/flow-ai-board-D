import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Brain from '@/pages/Brain';
import Changelog from '@/pages/Changelog';
import Provision from '@/pages/Provision';
import Integrations from '@/pages/Integrations';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/brain" element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Brain />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Integrations />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/changelog" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Changelog />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/provision" element={<Provision />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </WorkspaceProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;