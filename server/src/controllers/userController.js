const sql = require('../config/db');
const bcrypt = require('bcryptjs');

async function listUsers(req, res) {
  try {
    const users = await sql`SELECT id, username, email, full_name, role, status, site_id, permissions FROM users ORDER BY created_at DESC`;
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
}

async function createUser(req, res) {
  try {
    const { username, password, email, full_name, role, site_id } = req.body;

    // Check if username already exists
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Default permissions for Operators
    let permissions = {};
    if (role === 'Operator') {
      permissions = {
        Paddy: 'Creator',
        Production: 'Creator',
        Cleaning: 'Creator',
        Sales: 'Viewer',
        Accounts: 'No Role',
        Reports: 'No Role',
        UserManagement: 'No Role'
      };
    } else if (role === 'Admin') {
      permissions = {
        Paddy: 'Editor',
        Production: 'Editor',
        Cleaning: 'Editor',
        Sales: 'Editor',
        Accounts: 'Editor',
        Reports: 'Editor',
        UserManagement: 'Editor'
      };
    }

    const newUser = await sql`
      INSERT INTO users (username, password_hash, email, full_name, role, site_id, permissions)
      VALUES (${username}, ${password_hash}, ${email}, ${full_name}, ${role}, ${site_id}, ${JSON.stringify(permissions)})
      RETURNING id, username, email, full_name, role, status
    `;

    res.status(201).json(newUser[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await sql`UPDATE users SET status = ${status} WHERE id = ${id}`;
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status' });
  }
}

async function updatePermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    await sql`UPDATE users SET permissions = ${JSON.stringify(permissions)} WHERE id = ${id}`;
    res.json({ message: 'Permissions updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update permissions' });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await sql`DELETE FROM users WHERE id = ${id}`;
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUserStatus,
  updatePermissions,
  deleteUser
};
