import React from 'react';

const Footer = ({ customer }) => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {customer.name}
            </h3>
            {customer.address && (
              <p className="text-gray-600 text-sm mb-2">
                {customer.address}
              </p>
            )}
            {customer.phone && (
              <p className="text-gray-600 text-sm mb-2">
                Tel: {customer.phone}
              </p>
            )}
            {customer.email && (
              <p className="text-gray-600 text-sm">
                E-Mail: {customer.email}
              </p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Öffnungszeiten
            </h3>
            <div className="text-sm text-gray-600">
              {customer.workingHours?.map((hour, index) => (
                <div key={index} className="flex justify-between mb-1">
                  <span>
                    {hour.dayOfWeek === 0 && 'Sonntag'}
                    {hour.dayOfWeek === 1 && 'Montag'}
                    {hour.dayOfWeek === 2 && 'Dienstag'}
                    {hour.dayOfWeek === 3 && 'Mittwoch'}
                    {hour.dayOfWeek === 4 && 'Donnerstag'}
                    {hour.dayOfWeek === 5 && 'Freitag'}
                    {hour.dayOfWeek === 6 && 'Samstag'}
                  </span>
                  <span>
                    {hour.isWorkingDay ? `${hour.startTime} - ${hour.endTime}` : 'Geschlossen'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rechtliches
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <a href="/datenschutz" className="block hover:text-primary-600 transition-colors">
                Datenschutzerklärung
              </a>
              <a href="/impressum" className="block hover:text-primary-600 transition-colors">
                Impressum
              </a>
              <a href="/agb" className="block hover:text-primary-600 transition-colors">
                AGB
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} {customer.name}. Alle Rechte vorbehalten.
          </p>
          <p className="mt-2">
            Powered by Online-Terminbuchung
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;