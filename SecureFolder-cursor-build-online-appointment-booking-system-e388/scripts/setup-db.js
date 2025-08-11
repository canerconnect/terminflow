const { query } = require('../config/database');

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up database...');

    // Create customers table
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        subdomain VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table created');

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'assistant',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        patient_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        appointment_date TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 30,
        status VARCHAR(50) DEFAULT 'pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table created');

    // Create time_slots table
    await query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration INTEGER DEFAULT 30,
        max_bookings INTEGER DEFAULT 1,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Time slots table created');

    // Create blocked_dates table
    await query(`
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Blocked dates table created');

    // Create audit_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Audit logs table created');

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_bookings_customer_date ON bookings(customer_id, appointment_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_customer ON users(customer_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_time_slots_customer ON time_slots(customer_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');

    console.log('✅ Database indexes created');

    // Insert sample customer
    const customerResult = await query(`
      INSERT INTO customers (subdomain, name, email, phone, address, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (subdomain) DO NOTHING
      RETURNING id
    `, [
      'demo',
      'Demo Praxis',
      'demo@praxis.de',
      '0123-456789',
      'Musterstraße 123, 12345 Stadt',
      JSON.stringify({
        appointmentDuration: 30,
        workingHours: {
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' }
        }
      })
    ]);

    if (customerResult.rows.length > 0) {
      const customerId = customerResult.rows[0].id;
      
      // Insert sample user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await query(`
        INSERT INTO users (customer_id, username, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO NOTHING
      `, [customerId, 'admin', 'admin@demo.de', passwordHash, 'admin']);

      // Insert sample time slots
      const timeSlots = [
        { day: 1, start: '08:00', end: '12:00' }, // Monday morning
        { day: 1, start: '13:00', end: '17:00' }, // Monday afternoon
        { day: 2, start: '08:00', end: '12:00' }, // Tuesday morning
        { day: 2, start: '13:00', end: '17:00' }, // Tuesday afternoon
        { day: 3, start: '08:00', end: '12:00' }, // Wednesday morning
        { day: 3, start: '13:00', end: '17:00' }, // Wednesday afternoon
        { day: 4, start: '08:00', end: '12:00' }, // Thursday morning
        { day: 4, start: '13:00', end: '17:00' }, // Thursday afternoon
        { day: 5, start: '08:00', end: '12:00' }, // Friday morning
        { day: 5, start: '13:00', end: '17:00' }  // Friday afternoon
      ];

      for (const slot of timeSlots) {
        await query(`
          INSERT INTO time_slots (customer_id, day_of_week, start_time, end_time, duration)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [customerId, slot.day, slot.start, slot.end, 30]);
      }

      console.log('✅ Sample data inserted');
      console.log('📧 Demo customer: demo@praxis.de');
      console.log('👤 Admin user: admin@demo.de / admin123');
    }

    console.log('🎉 Database setup completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

setupDatabase();