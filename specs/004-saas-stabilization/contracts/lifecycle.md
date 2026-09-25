# Contract: Order & Booking Lifecycles (behavioral)

## Orders

States: `pending → confirmed → preparing → ready → out_for_delivery → completed`, plus `cancelled`
from any non-terminal state. `out_for_delivery` requires `order_type=delivery` (toggle ON per
FR-003b). Enforced in `changeStatus` (`orders.service.js:274-282`); customer cancel allows only
`pending|confirmed` inside grace, atomically.

Valid transitions (any other pair MUST be rejected with a clear message):

- pending → confirmed | preparing | cancelled
- confirmed → preparing | cancelled
- preparing → ready | cancelled
- ready → out_for_delivery | completed | cancelled
- out_for_delivery → completed | cancelled
- completed, cancelled → (terminal)

## Bookings

States: `pending → confirmed | cancelled`; `confirmed → completed | cancelled | noshow`.
Overlap rule (D-clarify): same restaurant + overlapping time windows MUST NOT both confirm.

## Retired

Delivery-login status path (`delivery.service.js:updateOrderStatus`) is removed with D4; restaurant
admins own all status changes. `updateStatus` stays unexported; if ever exported it MUST assert
transitions (one-line guard, R6).
