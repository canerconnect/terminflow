const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../config/database');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

const router = express.Router();

// @route   POST /api/booking
// @desc    Create new appointment
// @access  Public
router.post('/', [
  body('kundeId', 'Customer ID is required').notEmpty(),
  body('name', 'Name is required').notEmpty().isLength({ min: 2 }),
  body('email', 'Please include a valid email').isEmail(),
  body('datum', 'Date is required').isISO8601().toDate(),
  body('uhrzeit', 'Time is required').notEmpty(),
  body('telefon').optional().isMobilePhone('de-DE'),
  body('bemerkung').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { kundeId, name, email, telefon, datum, uhrzeit, bemerkung } = req.body;

    // Get customer settings
    const customerResult = await db.query(`
      SELECT c.*, s.appointment_duration, s.buffer_time, s.min_advance_booking_hours
      FROM customers c
      LEFT JOIN settings s ON c.id = s.customer_id
      WHERE c.id = $1
    `, [kundeId]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];
    const appointmentDuration = customer.appointment_duration || 30;
    const bufferTime = customer.buffer_time || 0;
    const minAdvanceHours = customer.min_advance_booking_hours || 2;

    // Check if booking is within allowed time range
    const bookingDateTime = moment(`${datum} ${uhrzeit}`, 'YYYY-MM-DD HH:mm');
    const now = moment();
    const minAdvanceTime = moment().add(minAdvanceHours, 'hours');

    if (bookingDateTime.isBefore(minAdvanceTime)) {
      return res.status(400).json({ 
        error: `Bookings must be made at least ${minAdvanceHours} hours in advance` 
      });
    }

    // Check if slot is available
    const startTime = moment(`${datum} ${uhrzeit}`, 'YYYY-MM-DD HH:mm');
    const endTime = startTime.clone().add(appointmentDuration, 'minutes');
    
    // Check for conflicts with existing appointments
    const conflictResult = await db.query(`
      SELECT id FROM appointments 
      WHERE customer_id = $1 
        AND date = $2 
        AND status != 'cancelled'
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
    `, [kundeId, datum, startTime.format('HH:mm:ss'), endTime.format('HH:mm:ss')]);

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    // Check for conflicts with blocked slots
    const blockedResult = await db.query(`
      SELECT id FROM blocked_slots 
      WHERE customer_id = $1 
        AND date = $2 
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
    `, [kundeId, datum, startTime.format('HH:mm:ss'), endTime.format('HH:mm:ss')]);

    if (blockedResult.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is blocked' });
    }

    // Check working hours
    const dayOfWeek = startTime.day();
    const workingHoursResult = await db.query(`
      SELECT * FROM working_hours 
      WHERE customer_id = $1 AND day_of_week = $2 AND is_working_day = true
    `, [kundeId, dayOfWeek]);

    if (workingHoursResult.rows.length === 0) {
      return res.status(400).json({ error: 'Booking not allowed on this day' });
    }

    const workingHours = workingHoursResult.rows[0];
    const workStart = moment(workingHours.start_time, 'HH:mm:ss');
    const workEnd = moment(workingHours.end_time, 'HH:mm:ss');
    const slotStart = startTime.clone().format('HH:mm:ss');
    const slotEnd = endTime.clone().format('HH:mm:ss');

    if (slotStart < workStart.format('HH:mm:ss') || slotEnd > workEnd.format('HH:mm:ss')) {
      return res.status(400).json({ error: 'Booking outside working hours' });
    }

    // Generate cancellation token
    const cancellationToken = uuidv4();

    // Create appointment
    const appointmentResult = await db.query(`
      INSERT INTO appointments (
        customer_id, name, email, phone, date, start_time, end_time, 
        notes, cancellation_token, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
      RETURNING *
    `, [
      kundeId, name, email, telefon, datum, 
      startTime.format('HH:mm:ss'), endTime.format('HH:mm:ss'), 
      bemerkung, cancellationToken
    ]);

    const appointment = appointmentResult.rows[0];

    // Send confirmation email
    try {
      const stornoLink = `${process.env.FRONTEND_URL}/storno/${cancellationToken}`;
      await sendEmail({
        to: email,
        subject: 'Terminbestätigung',
        template: 'bookingConfirmation',
        data: {
          name,
          datum: moment(datum).format('DD.MM.YYYY'),
          uhrzeit: uhrzeit,
          stornoLink
        }
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: appointment.id,
        name: appointment.name,
        email: appointment.email,
        date: appointment.date,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        cancellationToken: appointment.cancellation_token
      }
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/booking/:id
// @desc    Cancel appointment
// @access  Public (with token)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Cancellation token is required' });
    }

    // Find appointment by token
    const appointmentResult = await db.query(`
      SELECT a.*, c.name as customer_name, c.email as customer_email
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 AND a.cancellation_token = $2 AND a.status = 'confirmed'
    `, [id, token]);

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or already cancelled' });
    }

    const appointment = appointmentResult.rows[0];

    // Check cancellation deadline
    const appointmentDateTime = moment(`${appointment.date} ${appointment.start_time}`);
    const now = moment();
    const hoursUntilAppointment = appointmentDateTime.diff(now, 'hours', true);

    if (hoursUntilAppointment < 12) {
      return res.status(400).json({ error: 'Cancellation deadline has passed (12 hours before appointment)' });
    }

    // Cancel appointment
    await db.query(`
      UPDATE appointments 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [id]);

    // Send cancellation notification to customer
    try {
      await sendEmail({
        to: appointment.email,
        subject: 'Termin storniert',
        template: 'cancellationNotification',
        data: {
          name: appointment.name,
          datum: moment(appointment.date).format('DD.MM.YYYY'),
          uhrzeit: appointment.start_time
        }
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    res.json({ message: 'Appointment cancelled successfully' });

  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/booking/:id
// @desc    Get appointment details
// @access  Public (with token)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const appointmentResult = await db.query(`
      SELECT a.*, c.name as customer_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 AND a.cancellation_token = $2
    `, [id, token]);

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointmentResult.rows[0]);

  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;