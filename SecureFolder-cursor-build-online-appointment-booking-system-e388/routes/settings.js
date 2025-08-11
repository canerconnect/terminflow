const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/settings
// @desc    Get all settings for the authenticated customer
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId;

    const settingsResult = await db.query(`
      SELECT * FROM settings WHERE customer_id = $1
    `, [customerId]);

    const workingHoursResult = await db.query(`
      SELECT day_of_week, start_time, end_time, is_working_day
      FROM working_hours 
      WHERE customer_id = $1
      ORDER BY day_of_week
    `, [customerId]);

    const settings = settingsResult.rows[0] || {};
    const workingHours = workingHoursResult.rows;

    res.json({
      settings,
      workingHours
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/settings/blocked-slots
// @desc    Create a blocked slot (admin only)
// @access  Private
router.post('/blocked-slots', [
  auth,
  body('startDateTime').isISO8601(),
  body('endDateTime').isISO8601(),
  body('reason').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDateTime, endDateTime, reason } = req.body;
    const customerId = req.user.customerId;

    // Validate that end time is after start time
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Check for conflicts with existing appointments
    const conflictResult = await db.query(`
      SELECT id FROM appointments 
      WHERE customer_id = $1 
      AND (
        (start_datetime < $2 AND end_datetime > $2) OR
        (start_datetime < $3 AND end_datetime > $3) OR
        (start_datetime >= $2 AND end_datetime <= $3)
      )
    `, [customerId, startDateTime, endDateTime]);

    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Blocked slot conflicts with existing appointments' 
      });
    }

    // Check for conflicts with existing blocked slots
    const blockedConflictResult = await db.query(`
      SELECT id FROM blocked_slots 
      WHERE customer_id = $1 
      AND (
        (start_datetime < $2 AND end_datetime > $2) OR
        (start_datetime < $3 AND end_datetime > $3) OR
        (start_datetime >= $2 AND end_datetime <= $3)
      )
    `, [customerId, startDateTime, endDateTime]);

    if (blockedConflictResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Blocked slot overlaps with existing blocked slot' 
      });
    }

    // Create blocked slot
    const insertResult = await db.query(`
      INSERT INTO blocked_slots (
        customer_id, start_datetime, end_datetime, reason, created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [customerId, startDateTime, endDateTime, reason, req.user.id]);

    const blockedSlot = insertResult.rows[0];

    res.status(201).json({
      message: 'Blocked slot created successfully',
      blockedSlot: {
        id: blockedSlot.id,
        startDateTime: blockedSlot.start_datetime,
        endDateTime: blockedSlot.end_datetime,
        reason: blockedSlot.reason,
        createdAt: blockedSlot.created_at
      }
    });

  } catch (error) {
    console.error('Create blocked slot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/settings/blocked-slots
// @desc    Get all blocked slots for the authenticated customer
// @access  Private
router.get('/blocked-slots', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        bs.id, bs.start_datetime, bs.end_datetime, bs.reason, 
        bs.created_at, u.username as created_by
      FROM blocked_slots bs
      LEFT JOIN users u ON bs.created_by = u.id
      WHERE bs.customer_id = $1
    `;
    let params = [customerId];

    if (startDate && endDate) {
      query += ` AND bs.start_datetime >= $2 AND bs.end_datetime <= $3`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY bs.start_datetime DESC`;

    const result = await db.query(query, params);

    const blockedSlots = result.rows.map(slot => ({
      id: slot.id,
      startDateTime: slot.start_datetime,
      endDateTime: slot.end_datetime,
      reason: slot.reason,
      createdAt: slot.created_at,
      createdBy: slot.created_by
    }));

    res.json({ blockedSlots });

  } catch (error) {
    console.error('Get blocked slots error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/settings/blocked-slots/:id
// @desc    Update a blocked slot (admin only)
// @access  Private
router.put('/blocked-slots/:id', [
  auth,
  body('startDateTime').isISO8601(),
  body('endDateTime').isISO8601(),
  body('reason').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { startDateTime, endDateTime, reason } = req.body;
    const customerId = req.user.customerId;

    // Validate that end time is after start time
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Check if blocked slot exists and belongs to customer
    const existingResult = await db.query(`
      SELECT id FROM blocked_slots 
      WHERE id = $1 AND customer_id = $2
    `, [id, customerId]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Blocked slot not found' });
    }

    // Check for conflicts with existing appointments
    const conflictResult = await db.query(`
      SELECT id FROM appointments 
      WHERE customer_id = $1 
      AND id != $2
      AND (
        (start_datetime < $3 AND end_datetime > $3) OR
        (start_datetime < $4 AND end_datetime > $4) OR
        (start_datetime >= $3 AND end_datetime <= $4)
      )
    `, [customerId, id, startDateTime, endDateTime]);

    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Blocked slot conflicts with existing appointments' 
      });
    }

    // Check for conflicts with other blocked slots
    const blockedConflictResult = await db.query(`
      SELECT id FROM blocked_slots 
      WHERE customer_id = $1 
      AND id != $2
      AND (
        (start_datetime < $3 AND end_datetime > $3) OR
        (start_datetime < $4 AND end_datetime > $4) OR
        (start_datetime >= $3 AND end_datetime <= $4)
      )
    `, [customerId, id, startDateTime, endDateTime]);

    if (blockedConflictResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Blocked slot overlaps with existing blocked slot' 
      });
    }

    // Update blocked slot
    const updateResult = await db.query(`
      UPDATE blocked_slots 
      SET 
        start_datetime = $1,
        end_datetime = $2,
        reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND customer_id = $5
      RETURNING *
    `, [startDateTime, endDateTime, reason, id, customerId]);

    const updatedSlot = updateResult.rows[0];

    res.json({
      message: 'Blocked slot updated successfully',
      blockedSlot: {
        id: updatedSlot.id,
        startDateTime: updatedSlot.start_datetime,
        endDateTime: updatedSlot.end_datetime,
        reason: updatedSlot.reason,
        updatedAt: updatedSlot.updated_at
      }
    });

  } catch (error) {
    console.error('Update blocked slot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/settings/blocked-slots/:id
// @desc    Delete a blocked slot (admin only)
// @access  Private
router.delete('/blocked-slots/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customerId;

    const deleteResult = await db.query(`
      DELETE FROM blocked_slots 
      WHERE id = $1 AND customer_id = $2
      RETURNING id
    `, [id, customerId]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Blocked slot not found' });
    }

    res.json({ message: 'Blocked slot deleted successfully' });

  } catch (error) {
    console.error('Delete blocked slot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/settings/calendar-config
// @desc    Get calendar configuration for the authenticated customer
// @access  Private
router.get('/calendar-config', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId;

    const settingsResult = await db.query(`
      SELECT 
        appointment_duration, buffer_time, max_advance_booking_days,
        min_advance_booking_hours, cancellation_deadline_hours
      FROM settings WHERE customer_id = $1
    `, [customerId]);

    const workingHoursResult = await db.query(`
      SELECT day_of_week, start_time, end_time, is_working_day
      FROM working_hours 
      WHERE customer_id = $1
      ORDER BY day_of_week
    `, [customerId]);

    const settings = settingsResult.rows[0] || {};
    const workingHours = workingHoursResult.rows;

    res.json({
      settings,
      workingHours
    });

  } catch (error) {
    console.error('Get calendar config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;