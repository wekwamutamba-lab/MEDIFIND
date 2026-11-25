# MediFind API Reference

- **Base URL:** `http://localhost:5000/api` locally. The frontend reads it from `VITE_API_URL`.
- **Format:** all responses are JSON. Errors look like `{ "error": "message" }` and come with the matching HTTP status code.
- **Login:** every endpoint except `/health` needs `Authorization: Bearer <Supabase access token>`. The frontend adds this header automatically.
- **Approval:** apart from `/me`, every endpoint also needs an account an admin has approved.
- **Separate pharmacies:** every approved account belongs to one pharmacy, and every endpoint only reads and changes that pharmacy's data. A record of another pharmacy behaves as if it does not exist (`404`).
- **Admin-only endpoints:** a till operator who calls one gets `403` with the code `ADMIN_ONLY`.
- **CORS:** the backend accepts requests only from the origins listed in `CORS_ORIGIN`, separated by commas.

## Endpoints

| Method and path | What it does | Who |
|---|---|---|
| `GET /health` | Health check: `{ ok: true }` | Anyone |
| `GET /me` | Your staff record and status (works before approval) | Logged in |
| `POST /me/join` | Ask to join with the pharmacy join code | Logged in, no request yet |
| `POST /me/register` | Ask to become a pharmacy admin | Logged in, no request yet |
| `GET /products` | Products with stock status and expiry flags (`expiring_soon`, `expired`), plus search, filters and pages of up to 100 | Admin, till |
| `POST /products`, `PUT /products/:id`, `DELETE /products/:id` | Add, edit or delete a product | Admin |
| `POST /pos/checkout` | Complete a sale: creates the order and payment, updates stock and records the cashier. Send `customer_id` for a customer picked from the suggestions. A phone or email saved for someone with a different name gives `409` with `code: CUSTOMER_CONFLICT`, `field` and `customer`, and nothing is sold. The reply includes `pharmacy` (name, address, contact, licence) and `cashier` for the printed receipt | Admin, till |
| `POST /pos/note` | Type the sale: `{ note }` (up to 500 characters). Returns `{ customer_name, lines: [{ said, quantity, product_id, options, check }], used_ai }`. Sells nothing (rate limited) | Admin, till |
| `GET /orders` | Orders. Till operators see only their own. | Admin, till |
| `POST /orders` | Create an order | Admin, till |
| `PATCH /orders/:id` | Update an order's status | Admin |
| `GET /customers` | Customers. `search` matches name, email or phone number (by its digits) | Admin, till |
| `GET /payments` | Payments | Admin |
| `GET /overview`, `GET /sales` | Dashboard and sales figures | Admin |
| `POST /insights` | Pill: what runs out first (`restock` with `days_left`, `per_day`, `suggestedQty`, `reason`), `expiring`, and a `summary` (written by AI when `used_ai` is true). Rate limited | Admin |
| `GET /reports/weekly` | The last 7 days compared with the week before, as figures and as a ready-to-send `text`, plus `send_to` (the pharmacy's WhatsApp and email) | Admin |
| `POST /find` | AI supplier search, `{ query }` (rate limited) | Admin |
| `GET /restock`, `POST /restock` | List restock orders or place one | Admin |
| `PATCH /restock/:id/receive` | Mark a restock order received and add the stock | Admin |
| `GET/POST/PUT/DELETE /suppliers...` | Suppliers and their catalogues: the shared directory (marked `shared`, read-only) plus your own suppliers (`own`, which you can change) | Admin |
| `GET /support`, `POST /support` | Help and support messages | Admin, till |
| `GET /staff` | Join code, your record and all staff | Admin |
| `POST /staff/join-code` | Make a new join code | Admin |
| `PATCH /staff/:id` | Approve, decline, change role, suspend or reactivate someone | Admin |
| `GET /settings`, `PUT /settings` | Read or save your pharmacy's profile and stock rules (`low_stock_threshold`, `expiry_warning_days`) | Admin |
| `GET /platform/registrations` | New pharmacy registrations, waiting ones first | Platform owners |
| `POST /platform/registrations/:id/approve`, `.../decline` | Open a new pharmacy with that person as admin, or decline it | Platform owners |

The till operator's list of allowed endpoints is in `backend/lib/auth.js` (`TILL_ALLOWED`).
