// Sends an error to the browser.
// Errors made for people (with a status under 500, e.g. "Only 3 units in stock")
// keep their message. Anything else is a server or database fault: its details
// (table names, rules, keys) are only written to the server log, and the person
// gets a plain message instead.
export const SERVER_FAULT = 'Something went wrong on the server. Please try again.';

export function sendError(res, err) {
  const status = Number(err?.status);
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message, ...(err.extra || {}) });
  }
  console.error(err);
  return res.status(status >= 500 && status < 600 ? status : 500).json({ error: SERVER_FAULT });
}
