import React from 'react';
import { AppLayout } from './components/AppLayout';
import './index.css';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <AppLayout>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Flow AI Board</h1>
          <p className="text-muted-foreground">Welcome to your AI-powered Kanban board</p>
        </div>
      </AppLayout>
      <Toaster />
    </>
  );
}

export default App;