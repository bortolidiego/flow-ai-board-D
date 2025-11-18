import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';
import { ToastProvider } from './components/ui/toast';
import { WorkspaceProvider } from './hooks/useWorkspace';
import { UserRoleProvider } from './hooks/useUserRole';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <ToastProvider>
        <UserRoleProvider>
          <WorkspaceProvider>
            <App />
            <Toaster />
          </WorkspaceProvider>
        </UserRoleProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);