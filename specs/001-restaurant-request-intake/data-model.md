# Data Model: Restaurant Request Intake

**Feature**: 001-restaurant-request-intake | **Date**: 2026-09-22

## Entity: RestaurantRequest (`restaurant_requests`)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID PK default gen_random_uuid() | PK | internal |
| code | TEXT UNIQUE | 6-12 `[A-Za-z0-9]`, `upper(substring(md5...))` default, generated via `orderCode()` with retry on 23505 | phone reference, returned on create |
| customer_name | TEXT | 2-80 chars (`requireText`) | Arabic ok |
| restaurant_name | TEXT | 2-80 chars | desired page name |
| phone | TEXT | 7-20 chars (`cleanPhone` required) | digits/plus normalized |
| whatsapp | TEXT | 7-20 chars (`cleanPhone` required) | `wa.me/<digits>` link |
| city | TEXT | 0-60 (`cleanText`) default '' | optional |
| notes | TEXT | 0-500 (`cleanText`) default '' | optional |
| status | TEXT | `pending\|contacted\|approved\|rejected` default `pending` | owner workflow |
| created_at | TIMESTAMPTZ default now() | indexed DESC | inbox order |
| updated_at | TIMESTAMPTZ auto via trigger | — | status change |

Indexes: `created_idx DESC`, `status_idx`. Trigger `trg_restaurant_requests_updated` sets `updated_at`.

State transitions: `pending → contacted → approved|rejected`; any → any allowed via PATCH (simple, owner-trusted; no invalid-transition guard for v1, validator rejects unknown).

No relations (standalone). Future: manual `POST /api/owner/restaurants` creates tenant; no auto-FK.

## Validation mapping (from `validators.validateRestaurantRequest`)

- `customerName: requireText 2-80`, `restaurantName: requireText 2-80`, `phone: cleanPhone required`, `whatsapp: cleanPhone required`, `city: cleanText 0-60`, `notes: cleanText 0-500`.
