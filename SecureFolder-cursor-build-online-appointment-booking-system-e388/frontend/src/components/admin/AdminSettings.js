import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Cog6ToothIcon, 
  ClockIcon, 
  CalendarIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useCustomer } from '../../contexts/CustomerContext';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminSettings = () => {
  const { customer, updateProfile, updateWorkingHours, updateSettings } = useCustomer();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const tabs = [
    { id: 'profile', name: 'Profil', icon: Cog6ToothIcon },
    { id: 'working-hours', name: 'Arbeitszeiten', icon: ClockIcon },
    { id: 'settings', name: 'Einstellungen', icon: CalendarIcon },
    { id: 'blocked-slots', name: 'Blockierte Zeiten', icon: CalendarIcon }
  ];

  const showMessage = (type, message) => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      if (type === 'success') setSuccess(null);
      else setError(null);
    }, 5000);
  };

  if (!customer) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-600">Verwalten Sie Ihre Praxis-Einstellungen und Konfigurationen</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 inline mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'profile' && (
          <ProfileTab 
            customer={customer} 
            onUpdate={updateProfile}
            onSuccess={(message) => showMessage('success', message)}
            onError={(message) => showMessage('error', message)}
          />
        )}
        
        {activeTab === 'working-hours' && (
          <WorkingHoursTab 
            customer={customer} 
            onUpdate={updateWorkingHours}
            onSuccess={(message) => showMessage('success', message)}
            onError={(message) => showMessage('error', message)}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab 
            customer={customer} 
            onUpdate={updateSettings}
            onSuccess={(message) => showMessage('success', message)}
            onError={(message) => showMessage('error', message)}
          />
        )}
        
        {activeTab === 'blocked-slots' && (
          <BlockedSlotsTab 
            customer={customer}
            onSuccess={(message) => showMessage('success', message)}
            onError={(message) => showMessage('error', message)}
          />
        )}
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ customer, onUpdate, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || '',
    logoUrl: customer.logoUrl || '',
    primaryColor: customer.primaryColor || '#3B82F6',
    secondaryColor: customer.secondaryColor || '#1E40AF'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onUpdate(formData);
      onSuccess('Profil erfolgreich aktualisiert');
    } catch (err) {
      onError('Fehler beim Aktualisieren des Profils: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Praxis-Profil</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Praxis-Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primärfarbe
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                className="h-10 w-20 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sekundärfarbe
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                className="h-10 w-20 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Working Hours Tab Component
const WorkingHoursTab = ({ customer, onUpdate, onSuccess, onError }) => {
  const [workingHours, setWorkingHours] = useState(
    customer.workingHours || [
      { day: 1, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
      { day: 2, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
      { day: 3, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
      { day: 4, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
      { day: 5, startTime: '09:00', endTime: '17:00', isWorkingDay: true },
      { day: 6, startTime: '09:00', endTime: '13:00', isWorkingDay: false },
      { day: 0, startTime: '09:00', endTime: '17:00', isWorkingDay: false }
    ]
  );
  const [loading, setLoading] = useState(false);

  const dayNames = {
    0: 'Sonntag',
    1: 'Montag',
    2: 'Dienstag',
    3: 'Mittwoch',
    4: 'Donnerstag',
    5: 'Freitag',
    6: 'Samstag'
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setWorkingHours(prev => 
      prev.map(wh => 
        wh.day === day ? { ...wh, [field]: value } : wh
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onUpdate(workingHours);
      onSuccess('Arbeitszeiten erfolgreich aktualisiert');
    } catch (err) {
      onError('Fehler beim Aktualisieren der Arbeitszeiten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Arbeitszeiten</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {workingHours.map((wh) => (
          <div key={wh.day} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="w-24">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={wh.isWorkingDay}
                  onChange={(e) => handleWorkingHoursChange(wh.day, 'isWorkingDay', e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{dayNames[wh.day]}</span>
              </label>
            </div>
            
            {wh.isWorkingDay && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Von</label>
                  <input
                    type="time"
                    value={wh.startTime}
                    onChange={(e) => handleWorkingHoursChange(wh.day, 'startTime', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bis</label>
                  <input
                    type="time"
                    value={wh.endTime}
                    onChange={(e) => handleWorkingHoursChange(wh.day, 'endTime', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        ))}
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ customer, onUpdate, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    appointmentDuration: customer.settings?.appointmentDuration || 30,
    bufferTime: customer.settings?.bufferTime || 15,
    advanceBookingDays: customer.settings?.advanceBookingDays || 30,
    cancellationDeadlineHours: customer.settings?.cancellationDeadlineHours || 24,
    emailReminders: customer.settings?.emailReminders || true,
    smsReminders: customer.settings?.smsReminders || false,
    reminderTimeHours: customer.settings?.reminderTimeHours || 24
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onUpdate(formData);
      onSuccess('Einstellungen erfolgreich aktualisiert');
    } catch (err) {
      onError('Fehler beim Aktualisieren der Einstellungen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Termin-Einstellungen</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Termin-Dauer (Minuten) *
            </label>
            <select
              required
              value={formData.appointmentDuration}
              onChange={(e) => setFormData({...formData, appointmentDuration: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 Minuten</option>
              <option value={30}>30 Minuten</option>
              <option value={45}>45 Minuten</option>
              <option value={60}>60 Minuten</option>
              <option value={90}>90 Minuten</option>
              <option value={120}>120 Minuten</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pufferzeit zwischen Terminen (Minuten) *
            </label>
            <select
              required
              value={formData.bufferTime}
              onChange={(e) => setFormData({...formData, bufferTime: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Keine Pufferzeit</option>
              <option value={5}>5 Minuten</option>
              <option value={10}>10 Minuten</option>
              <option value={15}>15 Minuten</option>
              <option value={30}>30 Minuten</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vorausbuchung (Tage) *
            </label>
            <input
              type="number"
              required
              min="1"
              max="365"
              value={formData.advanceBookingDays}
              onChange={(e) => setFormData({...formData, advanceBookingDays: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stornierungsfrist (Stunden) *
            </label>
            <input
              type="number"
              required
              min="1"
              max="168"
              value={formData.cancellationDeadlineHours}
              onChange={(e) => setFormData({...formData, cancellationDeadlineHours: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Erinnerungen</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailReminders"
                checked={formData.emailReminders}
                onChange={(e) => setFormData({...formData, emailReminders: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="emailReminders" className="ml-2 text-sm text-gray-700">
                E-Mail-Erinnerungen
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="smsReminders"
                checked={formData.smsReminders}
                onChange={(e) => setFormData({...formData, smsReminders: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="smsReminders" className="ml-2 text-sm text-gray-700">
                SMS-Erinnerungen
              </label>
            </div>
          </div>
          
          {(formData.emailReminders || formData.smsReminders) && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Erinnerung senden (Stunden vor Termin)
              </label>
              <input
                type="number"
                required
                min="1"
                max="168"
                value={formData.reminderTimeHours}
                onChange={(e) => setFormData({...formData, reminderTimeHours: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Blocked Slots Tab Component
const BlockedSlotsTab = ({ customer, onSuccess, onError }) => {
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  useEffect(() => {
    fetchBlockedSlots();
  }, []);

  const fetchBlockedSlots = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/blocked-slots', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch blocked slots');
      
      const data = await response.json();
      setBlockedSlots(data.blockedSlots || []);
    } catch (err) {
      onError('Fehler beim Laden der blockierten Zeiten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen blockierten Zeitraum löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/blocked-slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (!response.ok) throw new Error('Failed to delete blocked slot');
      
      await fetchBlockedSlots();
      onSuccess('Blockierte Zeit erfolgreich gelöscht');
    } catch (err) {
      onError('Fehler beim Löschen: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Blockierte Zeiten</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Zeit blockieren</span>
        </button>
      </div>
      
      {blockedSlots.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Keine blockierten Zeiten vorhanden
        </div>
      ) : (
        <div className="space-y-4">
          {blockedSlots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">
                  {format(new Date(slot.startDate), 'dd.MM.yyyy', { locale: de })} - {format(new Date(slot.endDate), 'dd.MM.yyyy', { locale: de })}
                </div>
                <div className="text-sm text-gray-500">
                  {slot.startTime} - {slot.endTime} Uhr
                </div>
                {slot.reason && (
                  <div className="text-sm text-gray-600 mt-1">{slot.reason}</div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingSlot(slot)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(slot.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Blocked Slot Modal */}
      {(showAddModal || editingSlot) && (
        <BlockedSlotModal
          slot={editingSlot}
          onClose={() => {
            setShowAddModal(false);
            setEditingSlot(null);
          }}
          onSubmit={async (slotData) => {
            try {
              const url = editingSlot 
                ? `/api/settings/blocked-slots/${editingSlot.id}`
                : '/api/settings/blocked-slots';
              
              const method = editingSlot ? 'PUT' : 'POST';
              
              const response = await fetch(url, {
                method,
                headers: {
                  'Content-Type': 'application/json',
                  'x-auth-token': localStorage.getItem('token')
                },
                body: JSON.stringify(slotData)
              });

              if (!response.ok) throw new Error('Failed to save blocked slot');
              
              await fetchBlockedSlots();
              setShowAddModal(false);
              setEditingSlot(null);
              onSuccess(editingSlot ? 'Blockierte Zeit erfolgreich aktualisiert' : 'Zeit erfolgreich blockiert');
            } catch (err) {
              onError('Fehler beim Speichern: ' + err.message);
            }
          }}
        />
      )}
    </div>
  );
};

// Blocked Slot Modal Component
const BlockedSlotModal = ({ slot, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    startDate: slot ? format(new Date(slot.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    endDate: slot ? format(new Date(slot.endDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: slot ? slot.startTime : '09:00',
    endTime: slot ? slot.endTime : '17:00',
    reason: slot ? slot.reason : ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    onSubmit({
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      reason: formData.reason
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {slot ? 'Blockierte Zeit bearbeiten' : 'Zeit blockieren'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Startdatum *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enddatum *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Startzeit *
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endzeit *
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grund (optional)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              rows="3"
              placeholder="z.B. Urlaub, Fortbildung, Feiertag..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {slot ? 'Aktualisieren' : 'Blockieren'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;