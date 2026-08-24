'use strict';

/**
 * Authentication + authorization middleware.
 *
 * The session stores ONLY the user id; every request re-loads the user from
 * PostgreSQL so deactivation / role changes apply immediately. Restaurant
 * identity is ALWAYS derived from the database record of the authenticated
 * user — never from request parameters.
 */

const { query } = require('../db/pool');
const { unauthorized, forbidden } = require('../utils/errors');

async function attachUser(req, res, next) {
  req.user = null;
  try {
    const userId = req.session && req.session.userId;
    if (userId) {
      const { rows } = await query(
        `SELECT u.id, u.role, u.username, u.restaurant_id,
                r.is_active AS restaurant_is_active, r.slug AS restaurant_slug
         FROM users u
         LEFT JOIN restaurants r ON r.id = u.restaurant_id
         WHERE u.id = $1 AND u.is_active = TRUE`,
        [userId]
      );
      if (rows[0]) {
        req.user = rows[0];
      } else {
        // Stale session pointing to a deleted/deactivated user.
        req.session.destroy(() => {});
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

function requireOwner(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'owner') return next(forbidden());
  next();
}

function requireRestaurantAdmin(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'owner' && req.user.role !== 'admin') return next(forbidden());
  if (req.user.role === 'admin') {
    if (!req.user.restaurant_id) return next(forbidden('NO_RESTAURANT', 'Account is not linked to a restaurant'));
    if (req.user.restaurant_is_active === false) {
      return next(forbidden('RESTAURANT_DISABLED', 'This restaurant has been deactivated by the platform owner'));
    }
  }
  next();
}

/** Resolve the tenant id strictly from the authenticated user (multi-tenant guard). */
function tenantIdOf(req) {
  if (req.user.role === 'owner') return null; // owners act across tenants explicitly
  return req.user.restaurant_id;
}

module.exports = { attachUser, requireAuth, requireOwner, requireRestaurantAdmin, tenantIdOf };
