import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CustomerContext = createContext();

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};

export const CustomerProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get customer info from subdomain
  const getCustomerInfo = async (subdomain) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/customers/${subdomain}`);
      setCustomer(response.data.customer);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customer information');
      console.error('Error loading customer:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update customer profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put('/api/customers/profile', profileData);
      setCustomer(prev => ({ ...prev, ...response.data.customer }));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update working hours
  const updateWorkingHours = async (workingHours) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put('/api/customers/working-hours', { workingHours });
      setCustomer(prev => ({ ...prev, workingHours }));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update working hours');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update settings
  const updateSettings = async (settings) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put('/api/customers/settings', settings);
      setCustomer(prev => ({ ...prev, settings }));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get subdomain from current URL
  const getSubdomain = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost')) {
      return 'kunde'; // Default for development
    }
    const parts = hostname.split('.');
    return parts[0];
  };

  // Initialize customer info on mount
  useEffect(() => {
    const subdomain = getSubdomain();
    if (subdomain) {
      getCustomerInfo(subdomain);
    }
  }, []);

  const value = {
    customer,
    loading,
    error,
    getCustomerInfo,
    updateProfile,
    updateWorkingHours,
    updateSettings,
    getSubdomain
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};