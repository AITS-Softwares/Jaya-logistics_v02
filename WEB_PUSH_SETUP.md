# ERP browser push setup

The ERP has the browser subscription and service-worker foundation for Web Push. The first event is wired: when a Loading Info draft is submitted, users in the same company with Consignment Note view access (plus Admins) receive an in-app notification, followed by a push attempt if the server has VAPID configuration. The push text is `Loading Info is ready for LR creation.` and opens `/admin/Consignment-Note`.

## Server configuration

Generate a VAPID key pair on a trusted machine:

```sh
npx web-push generate-vapid-keys
```

Set these server-side environment variables in the deployment environment (and in `.env.local` for local development):

```dotenv
VAPID_PUBLIC_KEY=the_generated_public_key
VAPID_PRIVATE_KEY=the_generated_private_key
VAPID_SUBJECT=mailto:erp-admin@example.com
```

Keep `VAPID_PRIVATE_KEY` secret. Only `VAPID_PUBLIC_KEY` is returned to the browser. Use the same key pair for the lifetime of existing subscriptions; rotating it requires clients to subscribe again. `VAPID_SUBJECT` must be a `mailto:` or `https:` contact URI.

The application must be served over HTTPS in production (localhost is suitable for development). The deployment must run these API routes in the Node.js runtime and permit outbound HTTPS requests to browser push services.

## User flow

- The admin dashboard header shows **Enable notifications** when browser support and server configuration are available.
- The signed-in user explicitly grants browser permission and registers a subscription for that device.
- Subscriptions are saved per user and company. Logout removes the current device subscription before clearing the login token.
- The service worker shows generic push text and opens the supplied same-origin ERP path when clicked.
- Expired subscriptions reported as HTTP 404 or 410 are deleted by the sender helper.

## Add another reviewed ERP event

After saving the new event's in-app notification, call the sender helper with the explicitly selected recipient IDs and a non-sensitive payload:

```js
import { sendWebPushToUsers } from "@/lib/webPush";

await sendWebPushToUsers({
  companyId,
  userIds: recipientUserIds,
  payload: {
    title: "Loading Info ready",
    body: "Loading Info is ready for LR creation.",
    url: "/admin/Consignment-Note",
  },
});
```

Resolve `recipientUserIds` on the server from the agreed module permissions. Do not accept recipient IDs from the browser, and do not include payment amounts, account numbers, or other sensitive values in push text. A push send failure does not undo the already saved in-app record. If the deployment may stop a request before asynchronous work finishes, move delivery to a durable job/outbox before relying on it operationally.

## API

- `GET /api/push/public-key` exposes the public VAPID key and whether the feature is configured.
- `POST /api/push/subscriptions` saves the authenticated user's browser subscription.
- `DELETE /api/push/subscriptions` removes that authenticated user's subscription for the current device.

Before production use, pilot with the ManageEngine-installed app on a device and verify service-worker support, notification policy, permission, click-through, logout, and shared-device behavior.
