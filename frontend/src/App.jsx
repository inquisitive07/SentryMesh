import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EventProvider, useEvents } from './hooks/useEvents'
import Navbar from './components/Navbar'
import ToastContainer from './components/Toast'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import AlertDetails from './pages/AlertDetails'
import Nodes from './pages/Nodes'

function AppContent() {
  const { toasts, dismissToast } = useEvents()

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/:id" element={<AlertDetails />} />
          <Route path="/nodes" element={<Nodes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </BrowserRouter>
  )
}

