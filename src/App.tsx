import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import Index from './pages/Index';
import Auth from './pages/Auth';
import AcceptInvite from './pages/AcceptInvite';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WorkspaceProvider } from './hooks/useWorkspace'; // Importação explícita
import BrainPage from './pages/Brain'; // Importar BrainPage

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <WorkspaceProvider>
          <AppLayout>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/brain" element={<ProtectedRoute requireAdmin><BrainPage /></ProtectedRoute>} /> {/* Adicionar rota para BrainPage */}
            </Routes>
          </AppLayout>
        </WorkspaceProvider>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;