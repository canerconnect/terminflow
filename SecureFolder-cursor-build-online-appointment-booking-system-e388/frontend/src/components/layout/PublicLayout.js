import React from 'react';
import { Outlet } from 'react-router-dom';
import { useCustomer } from '../../contexts/CustomerContext';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from '../common/LoadingSpinner';

const PublicLayout = () => {
  const { customer, loading, error } = useCustomer();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Fehler beim Laden
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Kunde nicht gefunden
          </h1>
          <p className="text-gray-600">
            Die angeforderte Seite konnte nicht gefunden werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header customer={customer} />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer customer={customer} />
    </div>
  );
};

export default PublicLayout;