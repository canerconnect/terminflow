const db = require('../config/database');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create sample customer
    const customerResult = await db.query(`
      INSERT INTO customers (subdomain, name, email, phone, address, primary_color, secondary_color)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (subdomain) DO NOTHING
      RETURNING id
    `, [
      'arztpraxis',
      'Dr. Schmidt - Allgemeinmedizin',
      'info@arztpraxis.de',
      '+49 30 12345678',
      'Musterstraße 123, 10115 Berlin',
      '#2563EB',
      '#1E40AF'
    ]);

    if (customerResult.rows.length > 0) {
      const customerId = customerResult.rows[0].id;
      console.log('✅ Sample customer created');

      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await db.query(`
        INSERT INTO users (customer_id, username, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO NOTHING
      `, [customerId, 'admin', 'admin@arztpraxis.de', hashedPassword, 'admin']);
      console.log('✅ Admin user created (username: admin, password: admin123)');

      // Create working hours (Monday to Friday, 9:00-17:00)
      for (let day = 1; day <= 5; day++) {
        await db.query(`
          INSERT INTO working_hours (customer_id, day_of_week, start_time, end_time, is_working_day)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (customer_id, day_of_week) DO NOTHING
        `, [customerId, day, '09:00', '17:00', true]);
      }
      console.log('✅ Working hours created (Mon-Fri, 9:00-17:00)');

      // Create settings
      await db.query(`
        INSERT INTO settings (
          customer_id, appointment_duration, buffer_time, max_advance_booking_days,
          min_advance_booking_hours, cancellation_deadline_hours, send_email_reminders,
          send_sms_reminders, reminder_hours_before
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (customer_id) DO NOTHING
      `, [
        customerId, 30, 15, 90, 2, 12, true, false, 24
      ]);
      console.log('✅ Settings created');

      // Create sample appointments for next week
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const sampleAppointments = [
        {
          name: 'Max Mustermann',
          email: 'max@example.com',
          phone: '+49 170 1234567',
          date: nextWeek.toISOString().split('T')[0],
          start_time: '10:00',
          end_time: '10:30',
          notes: 'Erstgespräch'
        },
        {
          name: 'Anna Schmidt',
          email: 'anna@example.com',
          phone: '+49 170 7654321',
          date: nextWeek.toISOString().split('T')[0],
          start_time: '14:00',
          end_time: '14:30',
          notes: 'Nachsorge'
        }
      ];

      for (const appointment of sampleAppointments) {
        await db.query(`
          INSERT INTO appointments (
            customer_id, name, email, phone, date, start_time, end_time, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          customerId,
          appointment.name,
          appointment.email,
          appointment.phone,
          appointment.date,
          appointment.start_time,
          appointment.end_time,
          appointment.notes
        ]);
      }
      console.log('✅ Sample appointments created');

      console.log('\n🎉 Database seeding completed successfully!');
      console.log('\n📋 Sample data created:');
      console.log('   • Customer: arztpraxis.meinetermine.de');
      console.log('   • Admin user: admin / admin123');
      console.log('   • Working hours: Monday-Friday, 9:00-17:00');
      console.log('   • Sample appointments for next week');
    } else {
      console.log('ℹ️  Sample customer already exists, skipping...');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();