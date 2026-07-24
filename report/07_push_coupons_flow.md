# Push Notifications and Coupons Flow

## Web-Push Notifications (`routes/push.js`)
Handles browser push notifications using the `web-push` package.
- **VAPID Keys**: Loaded from environment variables, or automatically generated and printed for the admin to configure.
- **Endpoints**:
  - `GET /api/push/vapidPublicKey`: Exposes the public key to the frontend.
  - `POST /api/push/subscribe`: Saves the client's `PushSubscription` object to the `push_subscriptions` DB table.
  - `POST /api/push/unsubscribe`: Removes the subscription.
- **Admin Broadcast**: Admin can POST to `/api/admin/push/send` to broadcast a message to all users. Stale tokens (HTTP 404/410) are automatically pruned.

## Coupons Flow (`routes/coupons.js`)
Handles discount codes at checkout.
- **Endpoints**:
  - `POST /api/coupons/apply`: 
    - Validates coupon code against the DB (checks `active`, `expires_at`, `max_uses`).
    - Validates minimum order subtotal.
    - Calculates absolute or percentage discount.
    - Returns the applied discount to the frontend.
  - `POST /api/coupons/used/:id`: Increments `uses_count` (called implicitly after order success).

## Flowchart (Push Notifications)

```mermaid
graph TD
    A[Browser Client] -->|GET /vapidPublicKey| B(API)
    A -->|User allows permission| A
    A -->|POST /subscribe| B
    B -->|Save Subscription| C[(DB)]

    D[Admin Dashboard] -->|Broadcast Message| B
    B -->|Fetch all subscriptions| C
    B -->|webpush.sendNotification| E[Push Service (Google/FCM)]
    E --> A
    B -->|Delete 404/410 errors| C
```
