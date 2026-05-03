/**
 * Middleware to check user permissions for a specific module and action.
 * Access Levels: 'No Role' < 'Viewer' < 'Creator' < 'Editor'
 */
function checkPermission(module, requiredAction) {
  return (req, res, next) => {
    const user = req.user; // Set by authMiddleware
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // Super Admin check (optional, if you have a specific superadmin role)
    if (user.role === 'Admin') return next();

    const permissions = user.permissions || {};
    const userAccess = permissions[module] || 'No Role';

    const levels = {
      'No Role': 0,
      'Viewer': 1,
      'Creator': 2,
      'Editor': 3
    };

    const requiredLevel = levels[requiredAction] || 1;
    const currentLevel = levels[userAccess] || 0;

    if (currentLevel >= requiredLevel) {
      return next();
    }

    return res.status(403).json({ 
      message: `Access Denied: You need ${requiredAction} access for ${module} module.` 
    });
  };
}

module.exports = { checkPermission };
