# MediFind API Reference

- **Base URL:** `http://localhost:5000/api` locally. The frontend reads it from `VITE_API_URL`.
- **Format:** all responses are JSON. Errors look like `{ "error": "message" }` and come with the matching HTTP status code.
- **Login:** every endpoint except `/health` needs `Authorization: Bearer <Supabase access token>`. The frontend adds this header automatically.
- **Approval:** apart from `/me`, every endpoint also needs an account an admin has approved.
- **Admin-only endpoints:** a till operator who calls one gets `403` with the code `ADMIN_ONLY`.
- **CORS:** the backend accepts requests only from the origins listed in `CORS_ORIGIN`, separated by commas.

## Endpoints

| Method and path | What it does | Who |
|---|---|---|
| `GET /health` | Health check: `{ ok: true }` | Anyone |
| `GET /me` | Your staff record and status (works before approval) | Logged in |
| `POST /me/join` | Ask to join with the pharmacy join code | Logged in, no request yet |
| `POST /me/register` | Ask to become a pharmacy admin | Logged in, no request yet |
| `GET /products` | Products with stock status, plus search, filters and pages | Admin, till |
| `POST /products`, `PUT /products/:id`, `DELETE /products/:id` | Add, edit or delete a product | Admin |
| `POST /pos/checkout` | Complete a sale: creates the order and payment, updates stock and records the cashier | Admin, till |
| `GET /orders` | Orders. Till operators see only their own. | Admin, till |
| `POST /orders` | Create an order | Admin, till |
| `PATCH /orders/:id` | Update an order's status | Admin |
| `GET /customers` | Customers | Admin, till |
| `GET /payments` | Payments | Admin |
| `GET /overview`, `GET /sales` | Dashboard and sales figures | Admin |
| `POST /insights` | Pill AI stock insights (rate limited) | Admin |
| `POST /find` | AI supplier search, `{ query }` (rate limited) | Admin |
| `GET /restock`, `POST /restock` | List restock orders or place one | Admin |
| `PATCH /restock/:id/receive` | Mark a restock order received and add the stock | Admin |
| `GET/POST/PUT/DELETE /suppliers...` | Manage suppliers and their catalogues | Admin |
| `GET /support`, `POST /support` | Help and support messages | Admin, till |
| `GET /staff` | Join code, your record and all staff | Admin |
| `POST /staff/join-code` | Make a new join code | Admin |
| `PATCH /staff/:id` | Approve, decline, change role, suspend or reactivate someone | Admin |

The till operator's list of allowed endpoints is in `backend/lib/auth.js` (`TILL_ALLOWED`).
