const twilio = require('twilio');
require('dotenv').config();

// Initialize Twilio client
const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Send SMS
const sendSMS = async ({ to, message, template, data }) => {
  try {
    if (!client) {
      console.warn('⚠️  Twilio not configured, SMS sending disabled');
      return null;
    }

    let smsMessage = message;

    // Process template if provided
    if (template && data) {
      smsMessage = processTemplate(template, data);
    }

    const result = await client.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatPhoneNumber(to)
    });

    console.log(`✅ SMS sent to ${to}: ${result.sid}`);
    return result;

  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    throw error;
  }
};

// Process SMS template
const processTemplate = (template, data) => {
  let message = template;
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    message = message.replace(placeholder, data[key]);
  });
  return message;
};

// Format phone number for Twilio
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add country code if missing
  if (cleaned.startsWith('0')) {
    cleaned = '49' + cleaned.substring(1);
  }
  
  // Add + prefix
  return '+' + cleaned;
};

// Send appointment reminder SMS
const sendAppointmentReminder = async (appointment, customer) => {
  const template = process.env.SMS_REMINDER_TEMPLATE || 
    'Erinnerung: Ihr Termin morgen um {{uhrzeit}} bei {{customerName}}. Bei Fragen antworten Sie bitte auf diese SMS.';
  
  return sendSMS({
    to: appointment.phone,
    template,
    data: {
      uhrzeit: appointment.start_time,
      customerName: customer.name
    }
  });
};

// Send cancellation confirmation SMS
const sendCancellationConfirmation = async (appointment, customer) => {
  const template = 'Ihr Termin am {{datum}} um {{uhrzeit}} wurde erfolgreich storniert.';
  
  return sendSMS({
    to: appointment.phone,
    template,
    data: {
      datum: appointment.date,
      uhrzeit: appointment.start_time
    }
  });
};

// Send admin notification SMS
const sendAdminNotification = async (appointment, customer, adminPhone) => {
  const template = 'Neue Terminbuchung: {{name}} am {{datum}} um {{uhrzeit}}';
  
  return sendSMS({
    to: adminPhone,
    template,
    data: {
      name: appointment.name,
      datum: appointment.date,
      uhrzeit: appointment.start_time
    }
  });
};

// Check if SMS service is available
const isAvailable = () => {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
};

module.exports = {
  sendSMS,
  sendAppointmentReminder,
  sendCancellationConfirmation,
  sendAdminNotification,
  isAvailable
};