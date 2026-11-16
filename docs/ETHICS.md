# Ethical and Responsible AI Use

## Data privacy
- The AI receives only the text the pharmacist types and stock data: product names, quantities, categories and expiry dates. **No customer names, contact details, payment details or patient health information are sent to the AI.**
- The AI API key and the database service key stay on the server and are never exposed in the browser.
- Accounts use Supabase Auth. Passwords are handled and hashed by Supabase, and MediFind never stores them. Every API route requires a valid login token.
- Secrets are kept in environment variables and excluded from the repository.

## Bias and fairness
- Supplier ranking uses transparent, objective rules: delivery time when urgent, otherwise price. It does not use any personal data.
- The AI may understand common medicine names better than local or unusual ones, so the app shows the pharmacist what it understood and lets them correct the search.
- Sample supplier data is limited. A real deployment should include a wide range of suppliers so that small suppliers are not left out.

## Transparency
- The interface labels AI output ("Understood by AI", "Pill, your stock assistant").
- A disclaimer states that supplier prices and stock are indicative and that MediFind does not give medical advice.
- Failures fall back to simple rules rather than hiding errors, and these limits are documented in `AI_INTEGRATION.md`.

## Human in the loop
- The AI only suggests. Nothing is ordered automatically. The pharmacist reviews the supplier, quantity and total, and confirms every restock order.
- The AI is never used for medical decisions, diagnosis or dosing. Clinical judgement stays with the pharmacist.

## Safety and responsibility
- Medicines are safety-critical, so the system treats AI output as a convenience and not as an authority.
- Planned improvements: per-pharmacy data separation, an audit log of orders, and human review of AI suggestions before alerts are sent.