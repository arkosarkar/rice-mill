const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// const { auth } = require('../middleware/auth'); // Assuming you have an auth middleware

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/:id/status', userController.updateUserStatus);
router.put('/:id/permissions', userController.updatePermissions);
router.delete('/:id', userController.deleteUser);

module.exports = router;
