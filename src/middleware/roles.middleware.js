/**
 * Role hierarchy matching PHP Symfony security.yaml:
 * ROLE_ADMIN > ROLE_RECEPTIONIST > ROLE_TECHNICIEN > ROLE_USER
 */
const ROLE_HIERARCHY = {
    ROLE_ADMIN: ['ROLE_RECEPTIONIST', 'ROLE_TECHNICIEN', 'ROLE_USER'],
    ROLE_RECEPTIONIST: ['ROLE_USER'],
    ROLE_TECHNICIEN: ['ROLE_USER'],
    ROLE_USER: [],
};

/**
 * Get all roles including inherited roles
 */
const expandRoles = (roles) => {
    const expanded = new Set(roles);

    roles.forEach(role => {
        const inherited = ROLE_HIERARCHY[role] || [];
        inherited.forEach(r => expanded.add(r));
    });

    return Array.from(expanded);
};

/**
 * Check if user has any of the required roles
 */
const hasRole = (userRoles, requiredRoles) => {
    const expandedRoles = expandRoles(userRoles);
    return requiredRoles.some(role => expandedRoles.includes(role));
};

/**
 * Role-based authorization middleware factory
 * Usage: requireRoles(['ROLE_ADMIN', 'ROLE_RECEPTIONIST'])
 */
const requireRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRoles = req.user.getRoles();

        if (!hasRole(userRoles, roles)) {
            return res.status(403).json({
                error: 'Access denied',
                required: roles,
                userRoles: userRoles
            });
        }

        next();
    };
};

/**
 * Convenience middleware for common roles
 */
const requireAdmin = requireRoles(['ROLE_ADMIN']);
const requireReceptionist = requireRoles(['ROLE_ADMIN', 'ROLE_RECEPTIONIST']);
const requireTechnicien = requireRoles(['ROLE_ADMIN', 'ROLE_TECHNICIEN']);

module.exports = {
    requireRoles,
    requireAdmin,
    requireReceptionist,
    requireTechnicien,
    hasRole,
    expandRoles,
};
