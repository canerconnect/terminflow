const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  if (process.env.SENDGRID_API_KEY) {
    // Use SendGrid
    return nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    // Fallback to local SMTP (for development)
    return nodemailer.createTransporter({
      host: 'localhost',
      port: 1025,
      secure: false,
      ignoreTLS: true
    });
  }
};

// Load email template
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(process.env.EMAIL_TEMPLATES_DIR || './templates/emails', `${templateName}.html`);
    return await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return null;
  }
};

// Replace placeholders in template
const replacePlaceholders = (template, data) => {
  let result = template;
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, data[key]);
  });
  return result;
};

// Send email
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const transporter = createTransporter();
    
    let emailHtml = html;
    let emailText = text;

    // Load and process template if provided
    if (template && !html) {
      const templateContent = await loadTemplate(template);
      if (templateContent) {
        emailHtml = replacePlaceholders(templateContent, data);
        emailText = emailHtml.replace(/<[^>]*>/g, ''); // Strip HTML for text version
      }
    }

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@meinetermine.de',
      to,
      subject,
      html: emailHtml,
      text: emailText
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
};

// Send appointment confirmation
const sendAppointmentConfirmation = async (appointment, customer) => {
  const stornoLink = `${process.env.FRONTEND_URL}/storno/${appointment.cancellation_token}`;
  
  return sendEmail({
    to: appointment.email,
    subject: 'Terminbestätigung',
    template: 'bookingConfirmation',
    data: {
      name: appointment.name,
      datum: appointment.date,
      uhrzeit: appointment.start_time,
      customerName: customer.name,
      customerAddress: customer.address,
      customerPhone: customer.phone,
      stornoLink
    }
  });
};

// Send appointment reminder
const sendAppointmentReminder = async (appointment, customer) => {
  return sendEmail({
    to: appointment.email,
    subject: 'Erinnerung: Ihr Termin morgen',
    template: 'reminder',
    data: {
      name: appointment.name,
      datum: appointment.date,
      uhrzeit: appointment.start_time,
      customerName: customer.name,
      customerAddress: customer.address,
      customerPhone: customer.phone
    }
  });
};

// Send cancellation notification
const sendCancellationNotification = async (appointment, customer) => {
  return sendEmail({
    to: appointment.email,
    subject: 'Termin storniert',
    template: 'cancellationNotification',
    data: {
      name: appointment.name,
      datum: appointment.date,
      uhrzeit: appointment.start_time,
      customerName: customer.name
    }
  });
};

// Send admin notification for new booking
const sendAdminNotification = async (appointment, customer, adminEmail) => {
  return sendEmail({
    to: adminEmail,
    subject: 'Neue Terminbuchung',
    template: 'adminNotification',
    data: {
      name: appointment.name,
      email: appointment.email,
      phone: appointment.phone,
      datum: appointment.date,
      uhrzeit: appointment.start_time,
      bemerkung: appointment.notes,
      customerName: customer.name
    }
  });
};

module.exports = {
  sendEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendCancellationNotification,
  sendAdminNotification
};