import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import DonorDashboard from './pages/donor/DonorDashboard';
import RescuerDashboard from './pages/rescuer/RescuerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
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

        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
