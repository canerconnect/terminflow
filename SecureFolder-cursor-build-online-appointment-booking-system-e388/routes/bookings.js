const express = require('express');
const { query, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get all bookings for a customer (admin only)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      date, 
      status, 
      page = 1, 
      limit = 50,
      startDate,
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    const customerId = req.user.customerId;

    // Build query conditions
    let conditions = ['a.customer_id = $1'];
    let params = [customerId];
    let paramIndex = 2;

    if (date) {
      conditions.push(`a.date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }

    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`a.date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`a.date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get bookings with pagination
    const bookingsQuery = `
      SELECT 
        a.*,
        c.name as customer_name,
        c.primary_color,
        c.secondary_color
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      ${whereClause}
      ORDER BY a.date DESC, a.start_time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const finalParams = [...params, limit, offset];
    const bookingsResult = await db.query(bookingsQuery, finalParams);

    // Format dates and times
    const formattedBookings = bookingsResult.rows.map(booking => ({
      ...booking,
      date: moment(booking.date).format('YYYY-MM-DD'),
      startTime: moment(booking.start_time, 'HH:mm:ss').format('HH:mm'),
      endTime: moment(booking.end_time, 'HH:mm:ss').format('HH:mm'),
      formattedDate: moment(booking.date).format('DD.MM.YYYY'),
      formattedDateTime: moment(`${booking.date} ${booking.start_time}`).format('DD.MM.YYYY HH:mm')
    }));

    res.json({
      bookings: formattedBookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get specific booking details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customerId;

    const bookingResult = await db.query(`
      SELECT a.*, c.name as customer_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 AND a.customer_id = $2
    `, [id, customerId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    
    // Format dates and times
    const formattedBooking = {
      ...booking,
      date: moment(booking.date).format('YYYY-MM-DD'),
      startTime: moment(booking.start_time, 'HH:mm:ss').format('HH:mm'),
      endTime: moment(booking.end_time, 'HH:mm:ss').format('HH:mm'),
      formattedDate: moment(booking.date).format('DD.MM.YYYY'),
      formattedDateTime: moment(`${booking.date} ${booking.start_time}`).format('DD.MM.YYYY HH:mm')
    };

    res.json(formattedBooking);

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking (admin only)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, date, startTime, endTime, notes, status } = req.body;
    const customerId = req.user.customerId;

    // Validate required fields
    if (!name || !email || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if booking exists and belongs to customer
    const existingResult = await db.query(`
      SELECT id FROM appointments 
      WHERE id = $1 AND customer_id = $2
    `, [id, customerId]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check for conflicts if date/time changed
    if (date || startTime || endTime) {
      const conflictResult = await db.query(`
        SELECT id FROM appointments 
        WHERE customer_id = $1 
          AND date = $2 
          AND status != 'cancelled'
          AND id != $3
          AND (
            (start_time <= $4 AND end_time > $4) OR
            (start_time < $5 AND end_time >= $5) OR
            (start_time >= $4 AND end_time <= $5)
          )
      `, [customerId, date, id, startTime, endTime]);

      if (conflictResult.rows.length > 0) {
        return res.status(409).json({ error: 'Time slot conflict detected' });
      }
    }

    // Update booking
    const updateResult = await db.query(`
      UPDATE appointments 
      SET 
        name = $1,
        email = $2,
        phone = $3,
        date = $4,
        start_time = $5,
        end_time = $6,
        notes = $7,
        status = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND customer_id = $10
      RETURNING *
    `, [name, email, phone, date, startTime, endTime, notes, status, id, customerId]);

    const updatedBooking = updateResult.rows[0];

    res.json({
      message: 'Booking updated successfully',
      booking: {
        ...updatedBooking,
        date: moment(updatedBooking.date).format('YYYY-MM-DD'),
        startTime: moment(updatedBooking.start_time, 'HH:mm:ss').format('HH:mm'),
        endTime: moment(updatedBooking.end_time, 'HH:mm:ss').format('HH:mm')
      }
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Delete booking (admin only)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customerId;

    // Check if booking exists and belongs to customer
    const existingResult = await db.query(`
      SELECT id FROM appointments 
      WHERE id = $1 AND customer_id = $2
    `, [id, customerId]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Delete booking
    await db.query(`
      DELETE FROM appointments 
      WHERE id = $1 AND customer_id = $2
    `, [id, customerId]);

    res.json({ message: 'Booking deleted successfully' });

  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/bookings/:id/status
// @desc    Update booking status (admin only)
// @access  Private
router.post('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const customerId = req.user.customerId;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status
    const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if booking exists and belongs to customer
    const existingResult = await db.query(`
      SELECT id FROM appointments 
      WHERE id = $1 AND customer_id = $2
    `, [id, customerId]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update status
    await db.query(`
      UPDATE appointments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND customer_id = $3
    `, [status, id, customerId]);

    res.json({ message: 'Status updated successfully', status });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/bookings/stats/overview
// @desc    Get booking statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    let params = [customerId];
    let paramIndex = 2;

    if (startDate && endDate) {
      dateFilter = `AND a.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    // Get statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
        COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as upcoming,
        COUNT(CASE WHEN date < CURRENT_DATE THEN 1 END) as past
      FROM appointments a
      WHERE customer_id = $1 ${dateFilter}
    `, params);

    const stats = statsResult.rows[0];

    res.json({
      overview: {
        total: parseInt(stats.total),
        confirmed: parseInt(stats.confirmed),
        cancelled: parseInt(stats.cancelled),
        completed: parseInt(stats.completed),
        noShow: parseInt(stats.no_show),
        upcoming: parseInt(stats.upcoming),
        past: parseInt(stats.past)
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;