# MediFind API Contract (source of truth, do not change without telling the user)

Language: JavaScript only (no TypeScript).
Frontend: React + Vite in /frontend. Backend: Express in /backend. They are separate projects.
Backend base URL: http://localhost:5000/api (frontend reads it from VITE_API_URL).
All endpoints return JSON. Errors: { "error": "message" } with proper HTTP status.
CORS: backend allows the origin in CORS_ORIGIN.
Auth: MVP uses demo mode only (client-side "Continue as Demo Pharmacist"). No auth on API routes.
Health check: GET /api/health -> { ok: true }
Paths below are relative to the base URL (so "/products" means GET http://localhost:5000/api/products).
Note: where the endpoint list says /api/products etc., treat /api as the base URL.