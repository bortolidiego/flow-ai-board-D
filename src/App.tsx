"use client";

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Toaster } from '@/components/ui/toaster';

// Pages
import Index from '@/pages/Index';
import Brain from '@/pages/Brain';
import Changelog from '@/pages/Changelog';
import Provision from '@/pages/Provision';

// Auth
import Auth from '@/pages/Auth';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Auth Route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    {/* Main Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/brain" element={<Brain />} />
                    <Route path="/changelog" element={<Changelog />} />
                    
                    {/* Provision Route */}
                    <Route path="/provision" element={<Provision />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        
        <Toaster />
      </div>
    </Router>
  );
}

export default App;