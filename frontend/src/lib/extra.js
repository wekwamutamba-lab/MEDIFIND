const API = import.meta.env.VITE_API_URL;

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) throw new Error(data?.error || `${method} ${path} failed (${res.status})`);
  return data;
}

// Suppliers
export const listSuppliers = (search = '') =>
  call('GET', `/suppliers?search=${encodeURIComponent(search)}`);
export const createSupplier = (b) => call('POST', '/suppliers', b);
export const updateSupplier = (id, b) => call('PUT', `/suppliers/${id}`, b);
export const deleteSupplier = (id) => call('DELETE', `/suppliers/${id}`);
export const listSupplierProducts = (id) => call('GET', `/suppliers/${id}/products`);
export const addSupplierProduct = (id, b) => call('POST', `/suppliers/${id}/products`, b);
export const deleteSupplierProduct = (id, pid) =>
  call('DELETE', `/suppliers/${id}/products/${pid}`);

// Help and support
export const listTickets = () => call('GET', '/support');
export const sendTicket = (b) => call('POST', '/support', b);

// Top bar search: products, customers and orders at once
export async function globalSearch(q) {
  const enc = encodeURIComponent(q);
  const [p, c, o] = await Promise.allSettled([
    call('GET', `/products?search=${enc}&limit=4`),
    call('GET', `/customers?search=${enc}&limit=4`),
    call('GET', `/orders?search=${enc}&limit=4`),
  ]);
  return {
    products: p.status === 'fulfilled' ? p.value?.data ?? [] : [],
    customers: c.status === 'fulfilled' ? c.value?.data ?? [] : [],
    orders: o.status === 'fulfilled' ? o.value?.data ?? [] : [],
  };
}