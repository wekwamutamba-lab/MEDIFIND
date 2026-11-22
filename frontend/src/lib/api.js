const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(pathname, options = {}) {
  const url = `${BASE}${pathname}`;
  const method = (options.method || 'GET').toUpperCase();

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Show the server's own message (e.g. "Only 3 units in stock") when there is one;
    // the technical details are only used when it sent none
    const e = new Error(err.error || `${method} ${url} failed (${res.status}): ${res.statusText}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function qs(params) {
  return new URLSearchParams(params).toString();
}

export async function getProducts(params = {}) {
  return request(`/products?${qs({ page: '1', limit: '10', ...params })}`);
}

export async function createProduct(product) {
  const { name, category, quantity, price, expiryDate, pharmacyId } = product;
  return request('/products', {
    method: 'POST',
    body: JSON.stringify({
      name,
      category,
      quantity: Number(quantity),
      price: Number(price) || 0,
      expiry_date: expiryDate || null,
      pharmacy_id: pharmacyId || null,
    }),
  });
}

export async function updateProduct(id, updates) {
  const { name, category, quantity, price, expiryDate, pharmacyId } = updates;
  const fields = {};
  if (name !== undefined) fields.name = name;
  if (category !== undefined) fields.category = category;
  if (quantity !== undefined) fields.quantity = Number(quantity);
  if (price !== undefined) fields.price = Number(price);
  if (expiryDate !== undefined) fields.expiry_date = expiryDate || null;
  if (pharmacyId !== undefined) fields.pharmacy_id = pharmacyId;
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' });
}

export async function getOrders(params = {}) {
  return request(`/orders?${qs({ page: '1', limit: '10', ...params })}`);
}

export async function createOrder(order) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: order.customerName,
      product_name: order.medicine,
      quantity: Number(order.quantity),
      total: Number(order.total) || 0,
    }),
  });
}

export async function updateOrder(id, updates) {
  return request(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ order_status: updates.status }),
  });
}

export async function getCustomers(params = {}) {
  return request(`/customers?${qs({ page: '1', limit: '10', ...params })}`);
}

export async function getPayments(params = {}) {
  return request(`/payments?${qs({ page: '1', limit: '10', ...params })}`);
}

export async function getOverview() {
  return request('/stats/overview');
}

export async function getSales() {
  return request('/stats/sales');
}

export async function getInsights() {
  return request('/insights', { method: 'POST', body: JSON.stringify({}) });
}

export async function findSuppliers(query) {
  return request('/find', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function placeRestockOrder({ supplier_id, product_name, quantity }) {
  return request('/restock', {
    method: 'POST',
    body: JSON.stringify({ supplier_id, product_name, quantity: Number(quantity) }),
  });
}

export async function getRestockOrders() {
  return request('/restock');
}

export async function receiveRestock(id) {
  return request(`/restock/${id}/receive`, { method: 'PATCH' });
}
