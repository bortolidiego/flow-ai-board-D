"use client";
import React from 'react';
import { ThemeProvider, Suspense } from 'react-dom';
import App from './App'; // Updated import

function App() {
  return (
    <ThemeProvider theme="base">
      <Suspense fallback="Loading...">
        <App />
      </Suspense>
    </ThemeProvider>
  );
}
export default App;