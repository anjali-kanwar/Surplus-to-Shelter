import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import DonorDashboard from './pages/donor/DonorDashboard';
import RescuerDashboard from './pages/rescuer/RescuerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1F2937',
              color: '#F9FAFB',
              fontSize: '13px',
              fontWeight: '500',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#1F7A4D',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
            },
          }}
        />

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected donor routes */}
          <Route
            path="/donor/*"
            element={
              <ProtectedRoute requiredRole="donor">
                <DonorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected rescuer routes */}
          <Route
            path="/rescuer/*"
            element={
              <ProtectedRoute requiredRole="rescuer">
                <RescuerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected admin routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
