# Books Bots Drones Backend

Firebase Functions backend scaffold using TypeScript, Express, and Firebase Admin.

## Structure

- `functions/src/index.ts` configures the Express API and exports the Firebase HTTPS function.
- `functions/src/config/firebase.ts` initializes Firebase Admin services.
- `functions/src/controllers`, `routes`, `services`, `middleware`, `types`, and `utils` are ready for feature code.

## Commands

```bash
npm --prefix functions run build
npm --prefix functions run dev
```

The current API exposes `GET /health`.
# Customer commerce workflows

The API enforces the following business rules:

- Customers must sign in; guest carts are intentionally unsupported.
- A verified Firebase email is required before order creation or checkout.
- Customer cancellation is allowed until an order is delivered.
- Return requests are accepted for 30 days after `deliveredAt`.
- The non-Paystack option is stored as `pay_on_delivery`; payment becomes paid when delivery is confirmed.
- Promotion discounts are validated and calculated by the backend during order creation.

## Customer endpoints

- `POST /auth/email-verification`
- `PUT /auth/profile`
- `GET|POST /auth/addresses`
- `PUT|DELETE /auth/addresses/:id`
- `POST /promotions/validate`
- `DELETE /wishlist/clear`
- `POST /orders/:id/cancel`
- `POST /orders/:id/returns`
- `GET /orders/returns`
- `GET /orders/:id/invoice`

## Administrative endpoints

- `GET|POST /promotions`
- `PUT|DELETE /promotions/:id`
- `GET /orders/returns`
- `PUT /orders/returns/:returnId/status`

Return statuses supported by the administrative workflow are `approved`,
`rejected`, `received`, and `refunded`.
