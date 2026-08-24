'use strict';

/**
 * Optional demo data for development environments only.
 * Creates one demo restaurant with an admin account, settings, hours,
 * categories and menu items.
 *
 * Env: SEED_DEMO_PASSWORD (password for the demo admin account)
 * NEVER run this against production data.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../../server/db/pool');

const DEMO_SLUG = 'burger-house';

async function seedDemo() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('SEED_DEMO_PASSWORD must be set (min 10 characters).');
  }

  const existing = await pool.query('SELECT id FROM restaurants WHERE slug = $1', [DEMO_SLUG]);
  if (existing.rowCount > 0) {
    console.log('Demo restaurant already exists — nothing to do.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rest = await client.query(
      'INSERT INTO restaurants (slug, name, max_menu_items) VALUES ($1, $2, $3) RETURNING id',
      [DEMO_SLUG, 'Burger House', 50]
    );
    const restaurantId = rest.rows[0].id;

    await client.query(
      `INSERT INTO restaurant_settings (restaurant_id, description, phone, whatsapp, address, timezone, currency, delivery_fee_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        restaurantId,
        'Handcrafted burgers, fries and shakes.',
        '+15551234567',
        '15551234567',
        '12 Main Street, Springfield',
        'UTC',
        'USD',
        300,
      ]
    );

    for (let day = 0; day < 7; day++) {
      await client.query(
        'INSERT INTO restaurant_hours (restaurant_id, day_of_week, opens_at, closes_at) VALUES ($1, $2, $3, $4)',
        [restaurantId, day, '10:00', '23:00']
      );
    }

    const adminHash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (role, restaurant_id, username, password_hash)
       VALUES ('admin', $1, $2, $3)`,
      [restaurantId, 'burger-admin', adminHash]
    );

    const cats = [['Burgers', 0], ['Sides', 1], ['Drinks', 2]];
    const catIds = {};
    for (const [name, pos] of cats) {
      const row = await client.query(
        'INSERT INTO categories (restaurant_id, name, position) VALUES ($1, $2, $3) RETURNING id',
        [restaurantId, name, pos]
      );
      catIds[name] = row.rows[0].id;
    }

    const items = [
      ['Burgers', 'Classic Burger', 'Beef patty, lettuce, tomato, house sauce.', 850, true, false],
      ['Burgers', 'Double Cheese Burger', 'Two patties, double cheddar, pickles.', 1150, true, false],
      ['Burgers', 'Spicy Chicken Burger', 'Crispy chicken, chili mayo, jalapeños.', 950, false, false],
      ['Sides', 'French Fries', 'Golden crispy fries with sea salt.', 350, false, false],
      ['Sides', 'Onion Rings', 'Beer-battered onion rings.', 450, false, false],
      ['Drinks', 'Cola 330ml', 'Chilled cola can.', 200, false, false],
      ['Drinks', 'Milkshake', 'Vanilla, chocolate or strawberry.', 500, false, false],
    ];
    let pos = 0;
    for (const [cat, name, desc, price, popular, soldOut] of items) {
      await client.query(
        `INSERT INTO menu_items (restaurant_id, category_id, name, description, price_cents, is_popular, is_available, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [restaurantId, catIds[cat], name, desc, price, popular, !soldOut, pos++]
      );
    }

    await client.query('COMMIT');
    console.log(`Demo restaurant created: /restaurant/${DEMO_SLUG} (admin user "burger-admin")`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDemo()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seedDemo };
