"use client";
import React from 'react';
import AppLayout from './components/AppLayout';
import ThemeSelector from './components/ThemeSelector';

export default function App() {
  return (
    <AppLayout>
      <ThemeSelector />
    </AppLayout>
  );
}