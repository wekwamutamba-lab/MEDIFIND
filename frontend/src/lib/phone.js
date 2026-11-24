// Turns 0771234567 or +263 77 123 4567 into 263771234567 for wa.me links
export const waNumber = (raw) => {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '263' + d.slice(1);
  return d;
};
