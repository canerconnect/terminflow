const express = require('express');
const { query, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');

const router = express.Router();

// @route   GET /api/slots
// @desc    Get available time slots for a specific date
// @access  Public
router.get('/', [
  query('kundeId', 'Customer ID is required').notEmpty(),
  query('date', 'Date is required').isISO8601().toDate()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { kundeId, date } = req.query;

    // Get customer settings and working hours
    const customerResult = await db.query(`
      SELECT c.*, s.appointment_duration, s.buffer_time, s.max_advance_booking_days
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
    const maxAdvanceDays = customer.max_advance_booking_days || 90;

    // Check if date is within allowed range
    const requestedDate = moment(date);
    const now = moment();
    const maxAdvanceDate = now.clone().add(maxAdvanceDays, 'days');

    if (requestedDate.isBefore(now, 'day')) {
      return res.status(400).json({ error: 'Cannot book appointments in the past' });
    }

    if (requestedDate.isAfter(maxAdvanceDate, 'day')) {
      return res.status(400).json({ error: `Cannot book appointments more than ${maxAdvanceDays} days in advance` });
    }

    // Get working hours for the requested day
    const dayOfWeek = requestedDate.day();
    const workingHoursResult = await db.query(`
      SELECT * FROM working_hours 
      WHERE customer_id = $1 AND day_of_week = $2 AND is_working_day = true
    `, [kundeId, dayOfWeek]);

    if (workingHoursResult.rows.length === 0) {
      return res.json({ 
        date,
        slots: [],
        message: 'No working hours for this day'
      });
    }

    const workingHours = workingHoursResult.rows[0];
    const workStart = moment(workingHours.start_time, 'HH:mm:ss');
    const workEnd = moment(workingHours.end_time, 'HH:mm:ss');

    // Generate all possible time slots
    const slots = [];
    let currentTime = workStart.clone();
    
    while (currentTime.add(appointmentDuration, 'minutes').isBefore(workEnd)) {
      const slotStart = currentTime.clone().subtract(appointmentDuration, 'minutes');
      const slotEnd = currentTime.clone();
      
      slots.push({
        startTime: slotStart.format('HH:mm'),
        endTime: slotEnd.format('HH:mm'),
        available: true
      });
    }

    // Get existing appointments for this date
    const appointmentsResult = await db.query(`
      SELECT start_time, end_time 
      FROM appointments 
      WHERE customer_id = $1 
        AND date = $2 
        AND status != 'cancelled'
    `, [kundeId, date]);

    // Get blocked slots for this date
    const blockedResult = await db.query(`
      SELECT start_time, end_time 
      FROM blocked_slots 
      WHERE customer_id = $1 AND date = $2
    `, [kundeId, date]);

    // Mark unavailable slots
    const unavailableSlots = [...appointmentsResult.rows, ...blockedResult.rows];

    slots.forEach(slot => {
      const slotStart = moment(slot.startTime, 'HH:mm');
      const slotEnd = moment(slot.endTime, 'HH:mm');

      // Check if slot conflicts with any unavailable time
      const isConflict = unavailableSlots.some(unavailable => {
        const unavailableStart = moment(unavailable.start_time, 'HH:mm:ss');
        const unavailableEnd = moment(unavailable.end_time, 'HH:mm:ss');

        return (
          (slotStart < unavailableEnd && slotEnd > unavailableStart) ||
          (slotStart >= unavailableStart && slotEnd <= unavailableEnd)
        );
      });

      slot.available = !isConflict;
    });

    // Filter out slots that are too close to current time (if booking today)
    if (requestedDate.isSame(now, 'day')) {
      const minAdvanceHours = 2; // Minimum 2 hours advance booking
      const cutoffTime = now.clone().add(minAdvanceHours, 'hours');
      
      slots.forEach(slot => {
        const slotTime = moment(`${date} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
        if (slotTime.isBefore(cutoffTime)) {
          slot.available = false;
          slot.reason = 'Too close to current time';
        }
      });
    }

    // Add buffer time information
    if (bufferTime > 0) {
      slots.forEach((slot, index) => {
        if (index > 0 && slot.available) {
          const previousSlot = slots[index - 1];
          if (previousSlot.available) {
            const timeDiff = moment(slot.startTime, 'HH:mm')
              .diff(moment(previousSlot.endTime, 'HH:mm'), 'minutes');
            if (timeDiff < bufferTime) {
              slot.available = false;
              slot.reason = 'Buffer time required';
            }
          }
        }
      });
    }

    res.json({
      date,
      customerName: customer.name,
      workingHours: {
        start: workStart.format('HH:mm'),
        end: workEnd.format('HH:mm')
      },
      appointmentDuration,
      bufferTime,
      slots: slots.filter(slot => slot.available),
      totalSlots: slots.length,
      availableSlots: slots.filter(slot => slot.available).length
    });

  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/slots/next-available
// @desc    Get next available appointment slot
// @access  Public
router.get('/next-available', [
  query('kundeId', 'Customer ID is required').notEmpty()
], async (req, res) => {
  try {
    const { kundeId } = req.query;

    // Get customer settings
    const customerResult = await db.query(`
      SELECT c.*, s.appointment_duration, s.buffer_time
      FROM customers c
      LEFT JOIN settings s ON c.id = s.customer_id
      WHERE c.id = $1
    `, [kundeId]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];
    const appointmentDuration = customer.appointment_duration || 30;

    // Find next available slot starting from tomorrow
    let currentDate = moment().add(1, 'day');
    const maxDaysToCheck = 30; // Don't search more than 30 days ahead

    for (let i = 0; i < maxDaysToCheck; i++) {
      const checkDate = currentDate.clone().add(i, 'days');
      const dayOfWeek = checkDate.day();

      // Check if this day has working hours
      const workingHoursResult = await db.query(`
        SELECT * FROM working_hours 
        WHERE customer_id = $1 AND day_of_week = $2 AND is_working_day = true
      `, [kundeId, dayOfWeek]);

      if (workingHoursResult.rows.length > 0) {
        const workingHours = workingHoursResult.rows[0];
        const workStart = moment(workingHours.start_time, 'HH:mm:ss');
        
        // Check if this time slot is available
        const slotStart = checkDate.clone().set({
          hour: workStart.hour(),
          minute: workStart.minute(),
          second: 0
        });

        const slotEnd = slotStart.clone().add(appointmentDuration, 'minutes');

        // Check for conflicts
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
        `, [kundeId, checkDate.format('YYYY-MM-DD'), 
            slotStart.format('HH:mm:ss'), slotEnd.format('HH:mm:ss')]);

        if (conflictResult.rows.length === 0) {
          return res.json({
            nextAvailableSlot: {
              date: checkDate.format('YYYY-MM-DD'),
              startTime: slotStart.format('HH:mm'),
              endTime: slotEnd.format('HH:mm')
            }
          });
        }
      }
    }

    res.json({ 
      message: 'No available slots found in the next 30 days',
      nextAvailableSlot: null
    });

  } catch (error) {
    console.error('Get next available slot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;