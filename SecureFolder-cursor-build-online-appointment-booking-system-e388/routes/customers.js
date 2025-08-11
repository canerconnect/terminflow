const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/customers/:subdomain
// @desc    Get customer information by subdomain
// @access  Public
router.get('/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const customerResult = await db.query(`
      SELECT 
        id, name, email, phone, address, logo_url,
        primary_color, secondary_color, created_at
      FROM customers 
      WHERE subdomain = $1
    `, [subdomain]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // Get working hours
    const workingHoursResult = await db.query(`
      SELECT day_of_week, start_time, end_time, is_working_day
      FROM working_hours 
      WHERE customer_id = $1
      ORDER BY day_of_week
    `, [customer.id]);

    // Get settings
    const settingsResult = await db.query(`
      SELECT * FROM settings WHERE customer_id = $1
    `, [customer.id]);

    const settings = settingsResult.rows[0] || {};

    res.json({
      customer: {
        ...customer,
        workingHours: workingHoursResult.rows,
        settings
      }
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/customers/profile
// @desc    Update customer profile (admin only)
// @access  Private
router.put('/profile', [
  auth,
  body('name', 'Name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('phone').optional().isMobilePhone('de-DE'),
  body('address').optional().isLength({ max: 500 }),
  body('logoUrl').optional().isURL(),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i),
  body('secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, email, phone, address, logoUrl, primaryColor, secondaryColor 
    } = req.body;
    const customerId = req.user.customerId;

    // Check if email is already taken by another customer
    const emailCheckResult = await db.query(`
      SELECT id FROM customers 
      WHERE email = $1 AND id != $2
    `, [email, customerId]);

    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Update customer profile
    const updateResult = await db.query(`
      UPDATE customers 
      SET 
        name = $1,
        email = $2,
        phone = $3,
        address = $4,
        logo_url = $5,
        primary_color = $6,
        secondary_color = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, email, phone, address, logoUrl, primaryColor, secondaryColor, customerId]);

    const updatedCustomer = updateResult.rows[0];

    res.json({
      message: 'Profile updated successfully',
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        logoUrl: updatedCustomer.logo_url,
        primaryColor: updatedCustomer.primary_color,
        secondaryColor: updatedCustomer.secondary_color
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/customers/working-hours
// @desc    Update working hours (admin only)
// @access  Private
router.put('/working-hours', [
  auth,
  body('workingHours').isArray({ min: 1 }),
  body('workingHours.*.dayOfWeek').isInt({ min: 0, max: 6 }),
  body('workingHours.*.startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workingHours.*.endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workingHours.*.isWorkingDay').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { workingHours } = req.body;
    const customerId = req.user.customerId;

    // Delete existing working hours
    await db.query(`
      DELETE FROM working_hours WHERE customer_id = $1
    `, [customerId]);

    // Insert new working hours
    for (const hour of workingHours) {
      await db.query(`
        INSERT INTO working_hours (
          customer_id, day_of_week, start_time, end_time, is_working_day
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [
        customerId, 
        hour.dayOfWeek, 
        hour.startTime, 
        hour.endTime, 
        hour.isWorkingDay
      ]);
    }

    res.json({ 
      message: 'Working hours updated successfully',
      workingHours 
    });

  } catch (error) {
    console.error('Update working hours error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/customers/settings
// @desc    Update customer settings (admin only)
// @access  Private
router.put('/settings', [
  auth,
  body('appointmentDuration').isInt({ min: 15, max: 240 }),
  body('bufferTime').isInt({ min: 0, max: 60 }),
  body('maxAdvanceBookingDays').isInt({ min: 1, max: 365 }),
  body('minAdvanceBookingHours').isInt({ min: 0, max: 168 }),
  body('cancellationDeadlineHours').isInt({ min: 1, max: 168 }),
  body('sendEmailReminders').isBoolean(),
  body('sendSmsReminders').isBoolean(),
  body('reminderHoursBefore').isInt({ min: 1, max: 168 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      appointmentDuration,
      bufferTime,
      maxAdvanceBookingDays,
      minAdvanceBookingHours,
      cancellationDeadlineHours,
      sendEmailReminders,
      sendSmsReminders,
      reminderHoursBefore
    } = req.body;
    const customerId = req.user.customerId;

    // Update or insert settings
    const upsertResult = await db.query(`
      INSERT INTO settings (
        customer_id, appointment_duration, buffer_time, max_advance_booking_days,
        min_advance_booking_hours, cancellation_deadline_hours, send_email_reminders,
        send_sms_reminders, reminder_hours_before, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (customer_id) 
      DO UPDATE SET
        appointment_duration = EXCLUDED.appointment_duration,
        buffer_time = EXCLUDED.buffer_time,
        max_advance_booking_days = EXCLUDED.max_advance_booking_days,
        min_advance_booking_hours = EXCLUDED.min_advance_booking_hours,
        cancellation_deadline_hours = EXCLUDED.cancellation_deadline_hours,
        send_email_reminders = EXCLUDED.send_email_reminders,
        send_sms_reminders = EXCLUDED.send_sms_reminders,
        reminder_hours_before = EXCLUDED.reminder_hours_before,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      customerId, appointmentDuration, bufferTime, maxAdvanceBookingDays,
      minAdvanceBookingHours, cancellationDeadlineHours, sendEmailReminders,
      sendSmsReminders, reminderHoursBefore
    ]);

    const updatedSettings = upsertResult.rows[0];

    res.json({
      message: 'Settings updated successfully',
      settings: {
        appointmentDuration: updatedSettings.appointment_duration,
        bufferTime: updatedSettings.buffer_time,
        maxAdvanceBookingDays: updatedSettings.max_advance_booking_days,
        minAdvanceBookingHours: updatedSettings.min_advance_booking_hours,
        cancellationDeadlineHours: updatedSettings.cancellation_deadline_hours,
        sendEmailReminders: updatedSettings.send_email_reminders,
        sendSmsReminders: updatedSettings.send_sms_reminders,
        reminderHoursBefore: updatedSettings.reminder_hours_before
      }
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/customers/:subdomain/logo
// @desc    Get customer logo
// @access  Public
router.get('/:subdomain/logo', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const customerResult = await db.query(`
      SELECT logo_url FROM customers WHERE subdomain = $1
    `, [subdomain]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const logoUrl = customerResult.rows[0].logo_url;
    
    if (!logoUrl) {
      return res.status(404).json({ error: 'No logo found' });
    }

    res.json({ logoUrl });

  } catch (error) {
    console.error('Get logo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;