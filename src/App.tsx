import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChatwootContextProvider } from '@/components/ChatwootContextProvider';
import { ChatwootAuthHandler } from '@/components/ChatwootAuthHandler';
import { ProvisionGate } from '@/components/ProvisionGate';

// Pages
import KanbanBoard from '@/pages/KanbanBoard';
import Brain from '@/pages/Brain';
import BrainNew from '@/pages/BrainNew';
import Changelog from '@/pages/Changelog';
import Profile from '@/pages/Profile';
import Auth from '@/pages/Auth';
import AcceptInvite from '@/pages/AcceptInvite';
import UpdatePassword from '@/pages/UpdatePassword';
import ChatwootSetup from '@/pages/ChatwootSetup';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ChatwootContextProvider>
          <ChatwootAuthHandler>
            <Routes>
              {/* Rotas de Autenticação e Convite */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/provision" element={<ProvisionGate><AppLayout><KanbanBoard /></AppLayout></ProvisionGate>} />

              {/* Rotas Protegidas */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProvisionGate>
                      <AppLayout>
                        <KanbanBoard />
                      </AppLayout>
                    </ProvisionGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/brain"
                element={
                  <ProtectedRoute requireAdmin>
                    <ProvisionGate>
                      <AppLayout>
                        <Brain />
                      </AppLayout>
                    </ProvisionGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/brain/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <ProvisionGate>
                      <AppLayout>
                        <BrainNew />
                      </AppLayout>
                    </ProvisionGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/changelog"
                element={
                  <ProtectedRoute>
                    <ProvisionGate>
                      <AppLayout>
                        <Changelog />
                      </AppLayout>
                    </ProvisionGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProvisionGate>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProvisionGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chatwoot-setup"
                element={
                  <ProtectedRoute requireAdmin>
                    <ProvisionGate>
                      <AppLayout>
                        <ChatwootSetup />
                      </AppLayout>
                    </ProvisionGate>
                  </ProtectedRoute>
                }
              />

              {/* Rota 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ChatwootAuthHandler>
        </ChatwootContextProvider>
      </HashRouter>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;