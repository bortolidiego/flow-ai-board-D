import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Brain from './pages/Brain';
import BrainNew from './pages/BrainNew';
import ProvisionWrapper from './components/ProvisionWrapper';
import Changelog from './pages/Changelog';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/provision" element={<ProvisionWrapper />} />
        
        <Route path="/" element={<AppLayout />}>
          <Route 
            index 
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="brain" 
            element={
              <ProtectedRoute requireAdmin>
                <Brain />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="brain-new" 
            element={
              <ProtectedRoute requireAdmin>
                <BrainNew />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="changelog" 
            element={
              <ProtectedRoute>
                <Changelog />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;