// Small in-memory rate limiter for the endpoints that call Gemini, so one user
// (or a script with many accounts) cannot run up the AI bill.
// It needs no extra package. Counts reset when the server restarts, and each
// server instance counts separately, which is fine for a single Render instance.
//
// Limits can be changed on Render without a code change:
//   AI_LIMIT_PER_MINUTE      per user, default 10
//   AI_LIMIT_PER_DAY         per user, default 200
//   AI_LIMIT_GLOBAL_PER_MINUTE  all users together, default 60

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function createAiLimiter({
  perMinute = num(process.env.AI_LIMIT_PER_MINUTE, 10),
  perDay = num(process.env.AI_LIMIT_PER_DAY, 200),
  globalPerMinute = num(process.env.AI_LIMIT_GLOBAL_PER_MINUTE, 60),
  now = () => Date.now(),
} = {}) {
  const users = new Map(); // key -> timestamps (ms) in the last day, oldest first
  let global = []; // timestamps in the last minute, all users

  const keyFor = (req) => (req.user?.id ? `u:${req.user.id}` : `ip:${req.ip}`);

  const refuse = (res, waitMs, message) => {
    res.set('Retry-After', String(Math.max(1, Math.ceil(waitMs / 1000))));
    return res.status(429).json({ error: message });
  };

  function limiter(req, res, next) {
    const t = now();
    global = global.filter((x) => t - x < MINUTE);

    const key = keyFor(req);
    const hits = (users.get(key) || []).filter((x) => t - x < DAY);
    const lastMinute = hits.filter((x) => t - x < MINUTE);

    if (hits.length >= perDay) {
      users.set(key, hits);
      return refuse(res, DAY - (t - hits[0]),
        'You have reached today\'s limit for AI searches. Please try again tomorrow.');
    }
    if (lastMinute.length >= perMinute) {
      users.set(key, hits);
      return refuse(res, MINUTE - (t - lastMinute[0]),
        'Too many AI searches in a short time. Please wait a minute and try again.');
    }
    if (global.length >= globalPerMinute) {
      users.set(key, hits);
      return refuse(res, MINUTE - (t - global[0]),
        'The AI assistant is busy right now. Please try again in a minute.');
    }

    hits.push(t);
    users.set(key, hits);
    global.push(t);

    // Forget users with nothing in the last day so the map does not grow forever
    if (users.size > 5000) {
      for (const [k, v] of users) if (!v.length || t - v[v.length - 1] >= DAY) users.delete(k);
    }
    next();
  }

  return limiter;
}
