# AI Integration

## Which API

MediFind uses the **Google Gemini API** (model set by the `GEMINI_MODEL` environment variable, currently `gemini-3.8-flash`) through the official `@google/generative-ai` library. All AI calls are made from the Express backend. The API key is never sent to the browser.

## What the AI does

### 1. Supplier sourcing (`POST /api/find`)
The pharmacist types a request in plain language, for example "I urgently need 200 amoxicillin".
1. The backend sends the text to Gemini with an instruction to return only JSON: `{ "medicine", "quantity", "urgency" }`.
2. MediFind searches the supplier catalogue in the database for that medicine.
3. Results are ranked. If urgency is high, the fastest delivery comes first. Otherwise the lowest price comes first.
4. The app shows supplier cards with price, stock, delivery time, distance and an estimated total.

### 2. Pill, the stock assistant (`POST /api/insights`)
1. The backend collects products that are low or out of stock, and products expiring within 30 days.
2. It sends this list to Gemini and asks for JSON: a short summary, restock suggestions with quantities and reasons, and an expiring list.
3. The dashboard shows the result, and each suggestion has a "Find suppliers" button that runs the sourcing search.

## Fallbacks

If Gemini fails (missing key, quota, network error or invalid JSON), the backend does not break:
- Sourcing falls back to keyword and number extraction from the text.
- Insights fall back to a rule-based summary (low stock is any quantity under 20).

This keeps the app usable and the failure is logged on the server.

## Limitations

- The AI can misread an unusual or misspelled medicine name. The app shows what it understood ("Understood by AI") so the pharmacist can check it.
- Search matches by medicine name, not by active ingredient or brand equivalents.
- Supplier prices and stock in the demo are sample data.
- The free Gemini tier has rate limits, and model names change over time, so the model is configurable.
- The AI never gives medical advice, diagnoses or dosage guidance, and the prompts forbid it.

## Supplier tables (for local setup)

Run in the Supabase SQL Editor after the main schema:

```sql
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null, address text, phone text,
  lat numeric, lng numeric, delivery_hours integer default 24
);
create table if not exists supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade,
  product_name text not null, category text,
  unit_price numeric(10,2), stock integer default 0
);
create table if not exists restock_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  product_name text, quantity integer, total numeric(10,2),
  status text default 'Ordered', created_at timestamptz default now()
);
```
Then add a few suppliers and supplier products as sample data.