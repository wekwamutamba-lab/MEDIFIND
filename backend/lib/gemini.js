import { GoogleGenerativeAI } from '@google/generative-ai';

// One model setting for every AI feature. Set GEMINI_MODEL on Render to change it.
export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Sends one message to Gemini and returns its reply parsed as JSON.
// Throws if there is no key or the reply is not JSON, so callers can fall back.
export async function askGemini(system, text) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system });
  const out = await model.generateContent(text);
  return JSON.parse(out.response.text().replace(/```json|```/g, '').trim());
}
