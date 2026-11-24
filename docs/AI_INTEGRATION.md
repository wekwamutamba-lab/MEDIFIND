# AI Integration

## Which API

MediFind uses the **Google Gemini API** through Google's official Node.js library, `@google/generative-ai`.

- **Model:** set by the `GEMINI_MODEL` environment variable. The current default is `gemini-3.8-flash`, a fast, low-cost model. It can be changed on Render without a code change.
- **Where it runs:** every AI call is made by the Express backend, in `backend/lib/gemini.js`. The browser never sees the API key and never talks to Google directly.
- **Output format:** each call sends a system instruction that asks for **JSON only**. The backend parses the JSON and checks its shape before using it.

## What the AI does

### 1. Pill, the stock assistant (`POST /api/insights`)

Pill tells the pharmacist what to reorder and what is about to expire.

1. The backend selects the products that are low or out of stock (under 20 units) and the products that expire within 30 days.
2. It sends Gemini the **name, category, quantity and expiry date** of up to 15 items in each group. Nothing else is sent.
3. Gemini returns:
   ```json
   { "summary": "...", "restock": [{ "product": "...", "suggestedQty": 50, "reason": "..." }],
     "expiring": [{ "product": "...", "expiry_date": "2026-12-01" }] }
   ```
4. The dashboard shows the summary and the lists. Each restock suggestion has a **Find suppliers** button that runs the supplier search below.

![Pill stock insights](screenshots/pill-insights.png)

### 2. Supplier search (`POST /api/find`)

The pharmacist types what they need in their own words, for example "I urgently need 200 insulin".

1. The backend sends that text to Gemini with an instruction to return `{ "medicine": string, "quantity": number, "urgency": "low" | "medium" | "high" }`.
2. MediFind searches the supplier catalogue in the database for that medicine, keeping only suppliers who have it in stock.
3. **The ranking is done by fixed rules, not by the AI.** When urgency is high, the fastest delivery comes first. Otherwise, the lowest price comes first.
4. The screen shows **what the AI understood** (medicine, quantity, urgency) above the results. Each supplier card shows unit price, stock, delivery time, distance, estimated total, and whether the supplier can supply the full quantity.
5. The pharmacist chooses a supplier and confirms the order. Nothing is ordered automatically.

![AI supplier search](screenshots/restock-ai-search.png)

```
Pharmacist types a request
  -> Gemini extracts medicine, quantity, urgency   (or keyword rules if Gemini fails)
  -> search the supplier catalogue in Supabase
  -> rank: urgent = fastest delivery, otherwise = cheapest
  -> pharmacist checks and confirms the order
  -> "Mark received" adds the stock to inventory, exactly once
```

## When the AI is not available

The app keeps working without Gemini, for example when the key is missing, the quota has run out, the network fails, or the reply is not valid JSON:

- **Supplier search** falls back to simple parsing: the first number in the text is the quantity, words such as "urgent" or "asap" set high urgency, and the remaining keywords are searched.
- **Pill** falls back to a rule-based summary that lists the lowest-stock items first, with a suggested quantity that brings each one back up to about 50 units.

Each failure is logged on the server.

## Cost and abuse controls

- **Rate limits:** the two AI endpoints are limited to 10 requests a minute and 200 a day per user, and 60 a minute across all users. The limits can be changed with environment variables and are explained in `backend/lib/rateLimit.js`.
- **Login and approval:** only logged-in, approved staff can reach the AI endpoints.
- **Small requests:** Pill sends at most 30 short items, so each call costs a fraction of a cent.

## Limitations

- **Unusual names:** the AI can misread a misspelled or unusual medicine name, or a local brand name. This is why the screen shows what it understood, so the pharmacist can check it and search again.
- **Name matching only:** search matches the medicine name, not the active ingredient, so a brand name and its generic are not linked yet.
- **Supplier data:** supplier prices and stock come from the catalogue held in MediFind, not from live supplier systems. The app shows a disclaimer saying they are indicative.
- **Fixed thresholds:** Pill's "low stock" (under 20) and "expiring" (30 days) thresholds are fixed in the AI route for now.
- **Free tier:** the free Gemini tier has rate limits, and Google uses free-tier data to improve its products. A live deployment with real pharmacies should use the paid tier. See [ETHICS.md](ETHICS.md).
- **Model changes:** model names change over time, which is why the model is a setting.
- **No medical advice:** the AI never gives medical advice, diagnoses or dosage guidance, and both prompts forbid it.

## Supplier tables

The supplier tables (`suppliers`, `supplier_products`, `restock_orders`) are part of `backend/supabase/schema.sql`. Sample suppliers are in `seed_5_suppliers.sql`.
