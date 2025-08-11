import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerProvider } from './contexts/CustomerContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './components/public/Home';
import PublicCalendar from './components/public/PublicCalendar';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminCalendar from './components/admin/AdminCalendar';
import AdminBookings from './components/admin/AdminBookings';
import AdminSettings from './components/admin/AdminSettings';
import LoadingSpinner from './components/common/LoadingSpinner';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/calendar" element={<PublicCalendar />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/calendar" element={<AdminCalendar />} />
                <Route path="/admin/bookings" element={<AdminBookings />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CustomerProvider>
    </AuthProvider>
  );
}

export default App;