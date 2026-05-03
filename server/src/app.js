const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const paddyRoutes = require('./routes/paddyRoutes');
const cleaningRoutes = require('./routes/cleaningRoutes');
const productionRoutes = require('./routes/productionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const stockRoutes = require('./routes/stockRoutes');
const expenseRoutes = require('./routes/expensesRoutes');
const transactionRoutes = require('./routes/transaction.routes');
const plRoutes = require('./routes/pl.routes');
const gstRoutes = require('./routes/gst.routes');
const backorderRoutes = require('./routes/backorder.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const loanRoutes = require('./routes/loan.routes');
const partiesRoutes = require('./routes/partiesRoutes');
const notesRoutes = require('./routes/notesRoutes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/paddy-inwards', paddyRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/pl', plRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/backorders', backorderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/users', usersRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
