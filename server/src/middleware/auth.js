/**
 * auth.js — JWT Authentication Middleware
 * ✅ C-2 FIX: Protects all /api/* routes.
 *
 * Usage:
 *   Set JWT_SECRET in your .env file.
 *   To get a token, hit POST /api/auth/login with { username, password }.
 *   Pass the token in subsequent requests: Authorization: Bearer <token>
 *
 * Generating a token for testing (Node REPL):
 *   require('jsonwebtoken').sign({ user: 'admin' }, 'your_secret', { expiresIn: '8h' })
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'ricemill_dev_secret_change_in_production';

// ── Token verification middleware ──────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Provide a Bearer token.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;   // attach user info to the request for downstream use: { id, user, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

// ── Login handler — Task 1.4: Database query + bcrypt compare ──────────────
async function loginHandler(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // 1. Fetch user by username
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = result[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, user: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      expiresIn: '8h',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login.' });
  }
}

// ── Task 2: Internal User Management Routes ───────────────────────────────

/**
 * registerUserHandler — POST /api/users/register
 * Protected: Requires JWT auth.
 */
async function registerUserHandler(req, res) {
  const { username, password, role } = req.body || {};

  // Simple authorization: only admins can create new users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Only admins can register new users.' });
  }

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Check if user exists
    const check = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (check.length > 0) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'operator';

    // Insert user
    const result = await sql`
      INSERT INTO users (username, password_hash, role)
      VALUES (${username}, ${hashedPassword}, ${userRole})
      RETURNING id, username, role, created_at
    `;

    res.status(201).json({
      message: 'User created successfully.',
      user: result[0]
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ message: 'Error registering user.' });
  }
}

/**
 * listUsersHandler — GET /api/users
 * Protected: Requires JWT auth.
 */
async function listUsersHandler(req, res) {
  try {
    const users = await sql`SELECT id, username, role, created_at FROM users ORDER BY created_at DESC`;
    res.json(users);
  } catch (err) {
    console.error('List users error:', err.message);
    res.status(500).json({ message: 'Error fetching user list.' });
  }
}

module.exports = { requireAuth, loginHandler, registerUserHandler, listUsersHandler };

