import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Seite nicht gefunden
        </h2>
        
        <p className="text-gray-600 mb-8">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="btn-primary block w-full"
          >
            Zurück zur Startseite
          </Link>
          
          <Link
            to="/admin"
            className="btn-secondary block w-full"
          >
            Zum Admin-Bereich
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;