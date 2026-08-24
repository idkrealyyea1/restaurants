'use strict';

/**
 * Categories — strictly tenant-scoped.
 */

const { query } = require('../db/pool');
const { conflict, notFound } = require('../utils/errors');

async function listOwned(restaurantId) {
  const { rows } = await query(
    `SELECT c.id, c.name, c.position, COUNT(m.id)::int AS item_count
     FROM categories c
     LEFT JOIN menu_items m ON m.category_id = c.id
     WHERE c.restaurant_id = $1
     GROUP BY c.id
     ORDER BY c.position, c.name`,
    [restaurantId]
  );
  return rows;
}

async function getOwned(restaurantId, categoryId) {
  const { rows } = await query(
    'SELECT id, name, position FROM categories WHERE id = $1 AND restaurant_id = $2',
    [categoryId, restaurantId]
  );
  if (!rows[0]) throw notFound('Category not found');
  return rows[0];
}

async function createOwned(restaurantId, { name, position }) {
  try {
    const { rows } = await query(
      'INSERT INTO categories (restaurant_id, name, position) VALUES ($1, $2, $3) RETURNING id, name, position',
      [restaurantId, name, position || 0]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw conflict('CATEGORY_EXISTS', 'A category with this name already exists');
    throw err;
  }
}

async function updateOwned(restaurantId, categoryId, patch) {
  const sets = [];
  const params = [categoryId, restaurantId];
  if (patch.name !== undefined) {
    params.push(patch.name);
    sets.push(`name = $${params.length}`);
  }
  if (patch.position !== undefined) {
    params.push(patch.position);
    sets.push(`position = $${params.length}`);
  }
  if (sets.length === 0) return getOwned(restaurantId, categoryId);

  try {
    const { rows } = await query(
      `UPDATE categories SET ${sets.join(', ')} WHERE id = $1 AND restaurant_id = $2 RETURNING id, name, position`,
      params
    );
    if (!rows[0]) throw notFound('Category not found');
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw conflict('CATEGORY_EXISTS', 'A category with this name already exists');
    throw err;
  }
}

/** Deleting a category cascades to its items. */
async function deleteOwned(restaurantId, categoryId) {
  const { rowCount } = await query(
    'DELETE FROM categories WHERE id = $1 AND restaurant_id = $2',
    [categoryId, restaurantId]
  );
  if (!rowCount) throw notFound('Category not found');
}

module.exports = { listOwned, getOwned, createOwned, updateOwned, deleteOwned };
