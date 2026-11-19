import { useEffect, useState } from 'react';

// Returns value, but only after it has stopped changing for `ms` milliseconds.
// Used so list pages search once you pause typing, not on every key press.
export default function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
