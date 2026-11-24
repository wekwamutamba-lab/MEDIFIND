# Ethical and Responsible AI Use

MediFind's AI only makes suggestions. It never sees patient information, it never decides on its own, and a person confirms every order.

## Data privacy

- **What the AI sees:** Gemini receives only stock data (product names, categories, quantities and expiry dates) and the text a pharmacist types into the supplier search.
- **What it never sees:** customer names, phone numbers, emails, payment records, staff details or any patient health information are **never sent to the AI**.
- **Free tier and paid tier:** Google may use free-tier Gemini data to improve its products, but it does not use paid-tier data. MediFind sends no personal data, but a live deployment with real pharmacies should still use the paid tier, so even stock data is not reused.
- **Keys stay on the server:** the AI key and the database `service_role` key live only in server environment variables. They are never sent to the browser, and `.env` files are kept out of the repository. A key that has been exposed must be rotated.
- **Logins:** accounts use Supabase Auth. Supabase hashes the passwords, and MediFind never stores them.
- **Access:** every API request needs a valid login and an account an admin has approved. The database scripts (`schema.sql`, `security_fix.sql`) turn on row-level security for every table, so nobody can read the data directly with the public key.
- **Least access:** till operators can reach only selling, product lookup, customers and their own sales. The server enforces this.
- **Each pharmacy's data is private.** Every pharmacy only ever sees its own products, sales, customers, payments, staff and settings. MediFind platform owners, who approve new pharmacies, see the registration details only. The server enforces this on every request, and automated tests check it for every page.

## Bias and fairness

- **Ranking uses fixed, visible rules.** Suppliers are ranked by delivery time when the request is urgent, and by price otherwise. The AI does not rank suppliers, and no supplier can pay to be ranked higher.
- **Name recognition.** The AI may recognise common international medicine names better than local brands or misspellings. The screen always shows what the AI understood, so the pharmacist can spot a mistake and search again.
- **Small suppliers.** Results depend on which suppliers are in the catalogue. A real deployment should list a wide range of suppliers, including small local ones, so they are not left out.
- **No profiling.** The AI is never used to judge or profile customers or staff.

## Transparency

- **AI output is labelled.** Labels include "Understood by AI" on supplier search and "Pill, your stock assistant" on the dashboard.
- **Supplier data comes with a disclaimer.** The search results say that prices and stock are indicative, that the pharmacist should confirm with the supplier, and that MediFind does not give medical advice.
- **The app works without AI.** If the AI fails, MediFind falls back to simple rules instead of breaking, and these limits are documented in [AI_INTEGRATION.md](AI_INTEGRATION.md).
- **Sales are traceable.** Every sale records which staff member made it, and admins can see this on the Orders page.

## Human in the loop

- **People make every order.** Nothing is ordered automatically. The pharmacist reviews the supplier, quantity and total, then confirms each restock order.
- **People approve every account.** Admins approve each new account and can change roles or suspend someone at any time.
- **Clinical decisions stay with the pharmacist.** The AI is never used for diagnosis, dosing or any other medical decision.

## Safety

- **The AI is a helper, not an authority.** Medicines are safety-critical, so MediFind treats AI output as a convenience. Both AI prompts forbid medical advice.
- **Limits protect against abuse.** Rate limits on the AI endpoints stop any one account from running up costs or misusing the service.

## Planned improvements

- **An audit log** of stock changes and restock orders.
- **A clear AI notice**, shown to new staff the first time they use an AI feature.
