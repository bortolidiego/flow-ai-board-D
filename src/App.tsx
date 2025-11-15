import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Brain from './pages/Brain';
import Integrations from './pages/Integrations';
import Changelog from './pages/Changelog';
import './index.css';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Index />} />
          <Route path="brain" element={<Brain />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="changelog" element={<Changelog />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;