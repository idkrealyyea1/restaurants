# Contract: Tenant-Isolation Matrix (behavioral)

Every cell is a MUST. Probe script in tasks MUST cover all rows; any DENY leaking data fails closed.

| Actor | Own-tenant ops | Other tenant by ID/param | Platform ops |
|---|---|---|---|
| admin (restaurant A) | ALLOW (scoped `restaurant_id`) | DENY, no data | DENY |
| owner | ALLOW via explicit `?restaurantId=`, server-checked | n/a (explicit selection) | ALLOW |
| staff | DENY all incl. `?restaurantId=` (create-only: `POST /api/owner/restaurants`) | DENY | DENY except restaurant creation |
| (retired) delivery credential | DENY everywhere | DENY | DENY |
| visitor (no session) | public menu/order/track only | DENY, throttled | DENY |

Rules: tenant identity from `req.user.restaurant_id` only (never body/params); every tenant query
`WHERE restaurant_id=$`; `403 RESTAURANT_REQUIRED` when unresolved; generic 401/403 messages;
attempts logged without secrets.
