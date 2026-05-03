const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sql = require('./src/config/db');
const { requireAuth, loginHandler, registerUserHandler, listUsersHandler } = require('./src/middleware/auth');

// Import routes
const paddyRoutes = require('./src/routes/paddyRoutes');
const cleaningRoutes = require('./src/routes/cleaningRoutes');
const productionRoutes = require('./src/routes/productionRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const accountsRoutes = require('./src/routes/accountsRoutes');
const salesRoutes = require('./src/routes/salesRoutes');
const expensesRoutes = require('./src/routes/expensesRoutes');
const partiesRoutes = require('./src/routes/partiesRoutes');
const reportsRoutes = require('./src/routes/reportsRoutes');

const app = express();
const port = process.env.PORT || 5000;

// ✅ H-1 FIX: Restrict CORS to known frontend origin only.
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ✅ H-2 FIX: Rate limiting — 200 requests per 15 min per IP on all API routes.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again after 15 minutes.' },
});
app.use('/api', apiLimiter);

// ✅ C-2 FIX: Public login route — must be mounted BEFORE requireAuth guard.
app.post('/api/auth/login', loginHandler);

// Protect all other /api/* routes with JWT auth.
app.use('/api', requireAuth);

// ✅ Task 2: User management routes (protected by requireAuth)
const usersRoutes = require('./src/routes/users.routes');
app.use('/api/users', usersRoutes);


// Mount Routes
app.use('/api/paddy-inwards', paddyRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/reports', reportsRoutes);

async function start() {
  try {
    // 1. Initial Connectivity Check
    console.log('⏳ Connecting to Neon PostgreSQL...');
    const result = await sql`SELECT version()`;
    console.log('✅ Neon PostgreSQL connected successfully!');
    console.log('Database version:', result[0].version);

    // 2. Initialize Tables & Migrations
    console.log('⏳ Synchronizing database schema...');
    
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Auto-Seed Admin
    const userCountResult = await sql`SELECT COUNT(*) FROM users`;
    const userCount = parseInt(userCountResult[0].count, 10);
    if (userCount === 0) {
      const APP_USERNAME = process.env.APP_USERNAME || 'admin';
      const APP_PASSWORD = process.env.APP_PASSWORD || 'ricemill@2026';
      const hashedPassword = await bcrypt.hash(APP_PASSWORD, 10);
      await sql`INSERT INTO users (username, password_hash, role) VALUES (${APP_USERNAME}, ${hashedPassword}, 'admin')`;
      console.log('✅ First admin user seeded successfully.');
    }

    // 3. Initialize Standard Ledgers
    console.log('⏳ Initializing standard accounting ledgers...');
    const standardLedgers = [
      { name: 'Paddy Purchase A/C', group: 'Purchases' },
      { name: 'Sales Account', group: 'Sales' },
      { name: 'GST Payable', group: 'Current Liabilities' },
      { name: 'Input GST A/C', group: 'Current Assets' },
      { name: 'Deductions & Commission A/C', group: 'Indirect Incomes' },
      { name: 'Direct Labour - Cleaning', group: 'Direct Expenses' },
      { name: 'Electricity/Fuel Expense', group: 'Power & Fuel' },
      { name: 'Cash in Hand', group: 'Assets' },
      { name: 'SBI - Main Account', group: 'Bank Accounts' },
      { name: 'Capital Account', group: 'Capital Account' }
    ];
    for (const l of standardLedgers) {
      await sql`
        INSERT INTO ledgers (name, group_name) 
        VALUES (${l.name}, ${l.group}) 
        ON CONFLICT (name) DO UPDATE SET group_name = EXCLUDED.group_name
      `;
    }
    console.log('✅ Ledgers ready.');

    // 3. Main Tables
    await sql`
      CREATE TABLE IF NOT EXISTS paddy_inwards (
        id SERIAL PRIMARY KEY,
        entry_date DATE,
        entry_time TIME,
        inward_no TEXT UNIQUE,
        supplier_name TEXT,
        contact_number TEXT,
        village TEXT,
        paddy_variety TEXT,
        gross_weight_kg DECIMAL,
        tare_weight_kg DECIMAL,
        net_weight_kg DECIMAL,
        number_of_bags INTEGER,
        bag_weight_kg DECIMAL,
        moisture_percent DECIMAL,
        broken_percent DECIMAL,
        impurity_percent DECIMAL,
        rate_per_kg DECIMAL,
        total_amount DECIMAL,
        deductions DECIMAL,
        payable_amount DECIMAL,
        payment_mode TEXT,
        advance_paid DECIMAL,
        balance_amount DECIMAL,
        vehicle_number TEXT,
        driver_name TEXT,
        transport_charges DECIMAL,
        godown TEXT,
        lot_number TEXT,
        stack_number TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cleaning_batches (
        id SERIAL PRIMARY KEY,
        process_date DATE,
        shift TEXT,
        inward_ref TEXT,
        paddy_variety TEXT,
        source_godown TEXT,
        input_weight_kg DECIMAL,
        input_bags INTEGER,
        pre_cleaning_moisture_percent DECIMAL,
        stones_kg DECIMAL,
        dust_kg DECIMAL,
        straw_kg DECIMAL,
        other_waste_kg DECIMAL,
        total_waste_kg DECIMAL,
        waste_percent DECIMAL,
        clean_output_kg DECIMAL,
        output_bags INTEGER,
        post_cleaning_moisture_percent DECIMAL,
        destination_godown TEXT,
        destination_stack TEXT,
        efficiency_percent DECIMAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rice_stocks (
        id SERIAL PRIMARY KEY,
        item_type TEXT,
        variety TEXT,
        rice_type TEXT,
        godown TEXT,
        total_weight_kg DECIMAL,
        available_weight_kg DECIMAL,
        bags INTEGER,
        bag_weight_kg DECIMAL,
        source_ref TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        invoice_no TEXT UNIQUE,
        invoice_date DATE,
        customer_name TEXT,
        contact_number TEXT,
        address TEXT,
        gst_number TEXT,
        product_id INTEGER,
        variety TEXT,
        rice_type TEXT,
        quantity_kg DECIMAL,
        bags INTEGER,
        rate_per_kg DECIMAL,
        total_amount DECIMAL,
        tax_percent DECIMAL DEFAULT 0,
        tax_amount DECIMAL DEFAULT 0,
        customer_state TEXT,
        billing_address TEXT,
        shipping_address TEXT,
        sale_type TEXT,
        hsn_sac TEXT,
        taxable_value DECIMAL,
        cgst_amount DECIMAL,
        sgst_amount DECIMAL,
        igst_amount DECIMAL,
        is_rcm BOOLEAN DEFAULT false,
        grand_total DECIMAL,
        amount_received DECIMAL,
        balance_due DECIMAL,
        payment_mode TEXT,
        payment_status TEXT,
        delivery_date DATE,
        vehicle_number TEXT,
        driver_name TEXT,
        delivery_status TEXT,
        source_godown TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 4. Migrations & Extra Columns
    try {
      await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS ready_for_milling TEXT DEFAULT 'Yes - Send to Production'`;
      await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS impurity_after_percent DECIMAL`;
      await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS labour_count INTEGER`;
      await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS labour_cost DECIMAL`;
      await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS power_consumption DECIMAL`;
      await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS remarks TEXT`;

      await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS linked_party_id INTEGER, ADD COLUMN IF NOT EXISTS mobile TEXT, ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS gst_status TEXT`;
      await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_state TEXT, ADD COLUMN IF NOT EXISTS billing_address TEXT, ADD COLUMN IF NOT EXISTS shipping_address TEXT, ADD COLUMN IF NOT EXISTS sale_type TEXT, ADD COLUMN IF NOT EXISTS hsn_sac TEXT, ADD COLUMN IF NOT EXISTS taxable_value DECIMAL, ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL, ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL, ADD COLUMN IF NOT EXISTS igst_amount DECIMAL, ADD COLUMN IF NOT EXISTS is_rcm BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE paddy_inwards ADD COLUMN IF NOT EXISTS gst_rate DECIMAL DEFAULT 0, ADD COLUMN IF NOT EXISTS gst_amount DECIMAL DEFAULT 0`;
      await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS state TEXT, ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS shipping_address TEXT, ADD COLUMN IF NOT EXISTS credit_limit DECIMAL DEFAULT 0, ADD COLUMN IF NOT EXISTS opening_balance_date DATE`;
      
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS rice_stocks_agg_key ON rice_stocks (item_type, variety, rice_type, godown)`;
    } catch (e) {
      console.log('💡 Migrations note:', e.message);
    }

    // 5. Additional Core Tables
    await sql`
      CREATE TABLE IF NOT EXISTS productions (
        id SERIAL PRIMARY KEY,
        process_date DATE,
        production_no TEXT UNIQUE,
        shift TEXT,
        cleaning_batch_ref TEXT,
        paddy_variety TEXT,
        rice_type TEXT,
        paddy_input_kg DECIMAL,
        input_bags INTEGER,
        premium_rice_kg DECIMAL,
        grade_a_rice_kg DECIMAL,
        grade_b_rice_kg DECIMAL,
        broken_rice_kg DECIMAL,
        bran_kg DECIMAL,
        husk_kg DECIMAL,
        other_waste_kg DECIMAL,
        rice_storage_godown TEXT,
        rice_bags INTEGER,
        bag_weight_kg DECIMAL,
        yield_percent DECIMAL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ledgers (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        group_name TEXT,
        opening_balance DECIMAL DEFAULT 0,
        current_balance DECIMAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS parties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        mobile_number TEXT,
        address TEXT,
        state TEXT,
        gst_number TEXT,
        gst_status TEXT,
        opening_balance DECIMAL DEFAULT 0,
        note TEXT,
        ledger_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE,
        voucher_type TEXT,
        voucher_no TEXT UNIQUE,
        debit_ledger_id INTEGER,
        credit_ledger_id INTEGER,
        amount DECIMAL,
        narration TEXT,
        ref_module TEXT,
        ref_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        from_godown TEXT,
        to_godown TEXT,
        item_type TEXT,
        variety TEXT,
        rice_type TEXT,
        weight_kg DECIMAL,
        bags INTEGER,
        action_type TEXT,
        description TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        expense_date DATE NOT NULL,
        category TEXT NOT NULL,
        paid_to TEXT,
        amount DECIMAL NOT NULL,
        payment_mode TEXT DEFAULT 'Cash',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS godowns (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        capacity_kg DECIMAL DEFAULT 100000,
        type TEXT DEFAULT 'Bulk Storage',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 6. Auto-Seed Default Godowns
    const godownCountResult = await sql`SELECT COUNT(*) FROM godowns`;
    if (parseInt(godownCountResult[0].count) === 0) {
      console.log('🚀 Seeding default godowns...');
      const defaults = [['Godown A', 100000], ['Godown B', 100000], ['Godown C', 100000], ['Godown D', 100000]];
      for (const [name, cap] of defaults) {
        await sql`INSERT INTO godowns (name, capacity_kg) VALUES (${name}, ${cap})`;
      }
    }

    console.log('✅ Database initialization complete');
    

// 1. Frontend ki static files (CSS, JS, Images) Render ko dikhane ke liye
app.use(express.static(path.join(__dirname, '../client/dist')));

// 2. Health check for Render self-ping
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'active', timestamp: new Date().toISOString() });
});

// 3. Kisi bhi route par jane par React ka main page load karne ke liye
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- PASTE KHATAM ---
    app.listen(port, () => {
      console.log(`🚀 RiceMill backend LIVE on port ${port}`);
      
      // ✅ Self-Ping Implementation to prevent Render sleep mode
      const BASE_URL = process.env.BASE_URL;
      if (BASE_URL) {
        console.log(`📡 Self-ping active: Monitoring ${BASE_URL}/api/health`);
        setInterval(async () => {
          try {
            const response = await fetch(`${BASE_URL}/api/health`);
            if (response.ok) {
              console.log(`✅ [Self-Ping] Success: Instance is awake at ${new Date().toLocaleTimeString()}`);
            } else {
              console.warn(`⚠️ [Self-Ping] Warning: Received status ${response.status}`);
            }
          } catch (err) {
            console.error(`❌ [Self-Ping] Error: Ping failed.`, err.message);
          }
        }, 13 * 60 * 1000); // 13 minutes (Render sleeps at 15 mins)
      } else {
        console.log('💡 Note: BASE_URL not set. Self-ping skipped (Local environment).');
      }
    });

  } catch (err) {
    console.error('❌ FATAL ERROR DURING STARTUP:', {
      message: err.message || err,
      code: err.code,
      stack: err.stack?.split('\n')[1]?.trim()
    });
    console.warn('⚠️ Server will NOT exit. Please check your DB credentials in .env.');
    // process.exit(1);
  }
}

start();