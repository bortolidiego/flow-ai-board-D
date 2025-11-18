import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/theme-provider';
import KanbanBoard from './pages/KanbanBoard';
import AuthPage from './pages/Auth';
import BrainPage from './pages/Brain';
import ChangelogPage from './pages/Changelog';
import ProvisionWrapper from './components/ProvisionWrapper';
import { UserRoleProvider } from './hooks/useUserRole';
import { WorkspaceProvider } from './hooks/useWorkspace';

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <UserRoleProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/provision" element={<ProvisionWrapper />} />
              
              {/* Rotas Protegidas */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<KanbanBoard />} />
                <Route path="/brain" element={<ProtectedRoute requireAdmin><BrainPage /></ProtectedRoute>} />
                <Route path="/changelog" element={<ChangelogPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WorkspaceProvider>
      </UserRoleProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}

export default App;