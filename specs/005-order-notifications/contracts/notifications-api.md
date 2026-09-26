# Contract: Notifications API (behavioral)

Base patterns follow existing admin/owner routes (session cookie, `validatePagination`
`limit 1-100 default 25`, error envelope). All lists newest-first.

## Restaurant feed (`/api/admin`, `requireRestaurantAdmin`)

- `GET /api/admin/notifications?limit=&page=` → 200 `{ notifications: [{ id, orderId,
  orderCode, type, title, body, isRead, createdAt }], unreadCount, total }`. Rows limited to
  `recipient_user_id = caller AND restaurant_id = caller tenant`. No cross-tenant fields.
- `PATCH /api/admin/notifications/:id/read` → 200 `{ id, isRead: true }`. Updates only the
  caller's own row in their tenant; anything else → 404 (no leak) with no state change.

## Platform feed (`/api/owner`, `requireOwner`)

- `GET /api/owner/notifications?limit=&page=` → 200, same shape plus `restaurantId`,
  `restaurantName`, `restaurantSlug` per row. All restaurants; no tenant scoping.
- `PATCH /api/owner/notifications/:id/read` → 200; authorizes `role='owner'` + row ownership
  only — never tenant checks.

## Real-time (existing SSE hub, unchanged)

- Restaurant copy: `broadcast(restaurantId, 'notification:new', { id, orderCode, unreadCount })`
  right after commit in the order route (alongside the existing `order:new` event).
- Platform copy: `broadcast('__platform__', 'notification:new', { id, orderCode, restaurantId,
  restaurantSlug, unreadCount })`; new `GET /api/owner/events` subscribes owners to that key.
- Payloads are hints only — clients refetch the list (existing `onopen` refresh covers
  reconnects). Events never substitute storage.

## Authorization matrix

| Actor | Own feed | Other tenant feed | Mark others read |
|---|---|---|---|
| admin (A) | ALLOW (A rows) | DENY, no data | DENY |
| owner | ALLOW (platform feed) | n/a (no tenant scope) | DENY (not own row) |
| staff / visitor / retired | DENY | DENY | DENY |
