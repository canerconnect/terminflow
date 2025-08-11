import React, { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';

const BookingModal = ({ isOpen, onClose, onSuccess, customer }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    email: '',
    phone: '',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/booking', {
        ...formData,
        customerId: customer.id,
        // Add other necessary fields based on your API
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler bei der Terminbuchung');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Termin erfolgreich gebucht!
          </h3>
          <p className="text-gray-600">
            Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Termin buchen
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="patientName" className="form-label">
                Name *
              </label>
              <input
                id="patientName"
                name="patientName"
                type="text"
                required
                className="form-input"
                value={formData.patientName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                E-Mail *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="phone" className="form-label">
                Telefon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="remarks" className="form-label">
                Anmerkungen
              </label>
              <textarea
                id="remarks"
                name="remarks"
                rows={3}
                className="form-input"
                value={formData.remarks}
                onChange={handleChange}
                disabled={loading}
                placeholder="Optionale Anmerkungen zu Ihrem Termin..."
              />
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Wird gebucht...
                </>
              ) : (
                'Termin buchen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;