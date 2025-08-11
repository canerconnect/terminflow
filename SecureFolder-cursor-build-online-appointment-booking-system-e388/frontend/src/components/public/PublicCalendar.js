import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useCustomer } from '../../contexts/CustomerContext';
import axios from 'axios';
import BookingModal from './BookingModal';
import LoadingSpinner from '../common/LoadingSpinner';

const PublicCalendar = () => {
  const { customer } = useCustomer();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [error, setError] = useState('');

  // Get calendar days for current month
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start, end });
  };

  // Load available slots for selected date
  const loadAvailableSlots = async (date) => {
    if (!date) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/slots', {
        params: {
          date: format(date, 'yyyy-MM-dd'),
          customerId: customer.id
        }
      });
      
      setAvailableSlots(response.data.slots);
    } catch (err) {
      setError('Fehler beim Laden der verfügbaren Termine');
      console.error('Error loading slots:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    if (isSameMonth(date, currentDate)) {
      setSelectedDate(date);
      loadAvailableSlots(date);
    }
  };

  // Handle month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
    setSelectedDate(null);
    setAvailableSlots([]);
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
    setSelectedDate(null);
    setAvailableSlots([]);
  };

  // Handle slot selection
  const handleSlotSelect = (slot) => {
    setShowBookingModal(true);
  };

  // Handle successful booking
  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setSelectedDate(null);
    setAvailableSlots([]);
    // Reload slots for the current date
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Terminbuchung
            </h2>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h3 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy', { locale: de })}
              </h3>
              
              <button
                onClick={goToNextMonth}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="p-6">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="calendar-grid">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={index}
                  className={`calendar-day ${
                    !isCurrentMonth ? 'other-month' : ''
                  } ${
                    isCurrentDay ? 'today' : ''
                  } ${
                    isSelected ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => handleDateSelect(day)}
                >
                  <div className="text-sm font-medium mb-2">
                    {format(day, 'd')}
                  </div>
                  
                  {isSelected && (
                    <div className="text-xs text-primary-600 font-medium">
                      Ausgewählt
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Available Slots */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Verfügbare Termine am {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
            </h3>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => loadAvailableSlots(selectedDate)}
                  className="btn-primary"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Keine verfügbaren Termine an diesem Tag.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleSlotSelect(slot)}
                    className="time-slot available p-3 text-center rounded-md border-2 hover:bg-primary-50 transition-colors"
                  >
                    <div className="font-medium">{slot.time}</div>
                    <div className="text-sm text-gray-600">
                      {slot.duration} Min.
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSuccess={handleBookingSuccess}
          customer={customer}
        />
      )}
    </div>
  );
};

export default PublicCalendar;