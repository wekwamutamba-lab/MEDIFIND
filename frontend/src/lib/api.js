const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const delay = () =>
  new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

import {
  state,
  OVERVIEW,
  SALES,
  INSIGHTS,
} from './mock.js';

function parseId(path, resource) {
  return path.match(new RegExp(`^/${resource}/([^/]+)$`));
}

function paginate(items, params) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.max(1, parseInt(params.limit, 10) || 10);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    items: items.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    pages,
  };
}

async function handleMock(pathname, options) {
  const base = pathname.split('?')[0];
  const params = new URLSearchParams(pathname.split('?')[1] || '');
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;

  if (base === '/products' && method === 'GET') {
    let items = state.products;
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s)
      );
    }
    if (params.category) {
      items = items.filter((p) => p.category === params.category);
    }
    return paginate(items, params);
  }

  if (base === '/products' && method === 'POST') {
    const product = {
      id: `prod-${String(state.products.length + 1).padStart(3, '0')}`,
      sku: `MF-${String(9000 + state.products.length + 1)}`,
      ...body,
      price: Number(body.price),
      stock: Number(body.stock),
      minStock: Number(body.minStock || 15),
    };
    state.products.push(product);
    return { product };
  }

  const productId = parseId(base, 'products');
  if (productId && method === 'PUT') {
    const product = state.products.find((p) => p.id === productId[1]);
    if (!product) throw new Error('Product not found');
    Object.assign(product, body, { price: Number(body.price), stock: Number(body.stock) });
    return { product };
  }

  if (productId && method === 'DELETE') {
    const idx = state.products.findIndex((p) => p.id === productId[1]);
    if (idx === -1) throw new Error('Product not found');
    state.products.splice(idx, 1);
    return { ok: true, id: productId[1] };
  }

  if (base === '/orders' && method === 'GET') {
    let items = state.orders;
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter(
        (o) =>
          o.customerName.toLowerCase().includes(s) ||
          o.medicine.toLowerCase().includes(s) ||
          o.id.toLowerCase().includes(s)
      );
    }
    if (params.status) items = items.filter((o) => o.status === params.status);
    return paginate(items, params);
  }

  if (base === '/orders' && method === 'POST') {
    const order = {
      id: `ORD-${String(2500 + state.orders.length + 1)}`,
      customerId: body.customerId || `cust-${String(1 + rand(20)).padStart(3, '0')}`,
      customerName: body.customerName,
      medicine: body.medicine,
      quantity: Number(body.quantity) || 1,
      total: Number(body.total) || 0,
      status: body.status || 'Pending',
      paymentStatus: body.paymentStatus || 'Unpaid',
      date: new Date().toISOString().split('T')[0],
    };
    state.orders.push(order);
    return { order };
  }

  const orderId = parseId(base, 'orders');
  if (orderId && method === 'PUT') {
    const order = state.orders.find((o) => o.id === orderId[1]);
    if (!order) throw new Error('Order not found');
    Object.assign(order, body);
    return { order };
  }

  if (base === '/customers' && method === 'GET') {
    let items = state.customers;
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter(
        (c) => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s)
      );
    }
    return paginate(items, params);
  }

  if (base === '/payments' && method === 'GET') {
    let items = state.payments;
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.customerName.toLowerCase().includes(s) ||
          p.orderId.toLowerCase().includes(s)
      );
    }
    return paginate(items, params);
  }

  if (base === '/stats/overview' && method === 'GET') return OVERVIEW;
  if (base === '/stats/sales' && method === 'GET') return SALES;
  if (base === '/insights' && method === 'GET') return INSIGHTS;

  throw new Error(`Not found: ${method} ${pathname}`);
}

async function request(pathname, options = {}) {
  const url = `${BASE}${pathname}`;
  const method = (options.method || 'GET').toUpperCase();

  if (USE_MOCK) {
    await delay();
    return handleMock(pathname, options);
  }

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

function rand(max) {
  return Math.floor(Math.random() * max);
}
