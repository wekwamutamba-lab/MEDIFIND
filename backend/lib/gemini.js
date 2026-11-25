import { GoogleGenerativeAI } from '@google/generative-ai';

// One model setting for every AI feature. Set GEMINI_MODEL on Render to change it.
export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// How long to wait for Gemini before giving up, so a slow or stuck reply cannot hang
// New Sale, Pill or the supplier search: every caller falls back to its plain rules.
// Set AI_TIMEOUT_MS on Render to change it.
export const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) > 0 ? Number(process.env.AI_TIMEOUT_MS) : 12000;

// Sends one message to Gemini and returns its reply parsed as JSON.
// Throws if there is no key or the reply is not JSON, so callers can fall back.
export async function askGemini(system, text) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system }, { timeout: TIMEOUT_MS });
  const out = await model.generateContent(text);
  return JSON.parse(out.response.text().replace(/```json|```/g, '').trim());
}
