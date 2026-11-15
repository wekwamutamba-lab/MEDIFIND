const DELAY = () =>
  new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

export const CATEGORIES = [
  'Pain Relief',
  'Antibiotics',
  'Vitamins',
  'Cardiac',
  'Diabetes',
  'Respiratory',
  'Antibacterial',
  'Skincare',
  'Pediatrics',
  'Neurology',
];

const PRODUCT_TEMPLATES = [
  { name: 'Paracetamol 500mg', category: 'Pain Relief', price: 4.50 },
  { name: 'Ibuprofen 400mg', category: 'Pain Relief', price: 6.20 },
  { name: 'Diclofenac Sodium 50mg', category: 'Pain Relief', price: 5.80 },
  { name: 'Tramadol 50mg', category: 'Pain Relief', price: 12.00 },
  { name: 'Naproxen 250mg', category: 'Pain Relief', price: 8.90 },
  { name: 'Amoxicillin 250mg', category: 'Antibiotics', price: 15.00 },
  { name: 'Azithromycin 500mg', category: 'Antibiotics', price: 22.50 },
  { name: 'Ciprofloxacin 500mg', category: 'Antibiotics', price: 18.75 },
  { name: 'Doxycycline 100mg', category: 'Antibiotics', price: 14.20 },
  { name: 'Amoxicillin-Clavulanate 625mg', category: 'Antibiotics', price: 26.00 },
  { name: 'Vitamin C 500mg', category: 'Vitamins', price: 9.50 },
  { name: 'Vitamin D3 2000 IU', category: 'Vitamins', price: 11.00 },
  { name: 'B-Complex', category: 'Vitamins', price: 7.80 },
  { name: 'Multivitamin Tablets', category: 'Vitamins', price: 10.50 },
  { name: 'Calcium + D3', category: 'Vitamins', price: 13.20 },
  { name: 'Atorvastatin 20mg', category: 'Cardiac', price: 16.40 },
  { name: 'Amlodipine 5mg', category: 'Cardiac', price: 7.60 },
  { name: 'Metoprolol 50mg', category: 'Cardiac', price: 9.10 },
  { name: 'Lisinopril 10mg', category: 'Cardiac', price: 8.30 },
  { name: 'Clopidogrel 75mg', category: 'Cardiac', price: 19.50 },
  { name: 'Metformin 500mg', category: 'Diabetes', price: 6.90 },
  { name: 'Glimepiride 2mg', category: 'Diabetes', price: 8.70 },
  { name: 'Insulin Glargine 100IU/ml', category: 'Diabetes', price: 45.00 },
  { name: 'Acarbose 50mg', category: 'Diabetes', price: 14.00 },
  { name: 'Sitagliptin 100mg', category: 'Diabetes', price: 31.00 },
  { name: 'Salbutamol Inhaler', category: 'Respiratory', price: 18.00 },
  { name: 'Montelukast 10mg', category: 'Respiratory', price: 20.50 },
  { name: 'Cetirizine 10mg', category: 'Respiratory', price: 5.40 },
  { name: 'Tiotropium 18mcg', category: 'Respiratory', price: 24.00 },
  { name: 'Ipratropium Bromide', category: 'Respiratory', price: 21.00 },
  { name: 'Mupirocin Ointment', category: 'Antibacterial', price: 17.50 },
  { name: 'Silver Sulfadiazine Cream', category: 'Antibacterial', price: 15.00 },
  { name: 'Clindamycin 300mg', category: 'Antibacterial', price: 19.00 },
  { name: 'Erythromycin 500mg', category: 'Antibacterial', price: 13.00 },
  { name: 'Flucloxacillin 500mg', category: 'Antibacterial', price: 16.00 },
  { name: 'Clotrimazole 1%', category: 'Skincare', price: 7.20 },
  { name: 'Hydrocortisone 1%', category: 'Skincare', price: 6.50 },
  { name: 'Benzoyl Peroxide 5%', category: 'Skincare', price: 8.80 },
  { name: 'Tretinoin 0.025%', category: 'Skincare', price: 14.50 },
  { name: 'Daily Moisturizer', category: 'Skincare', price: 9.90 },
  { name: 'Paracetamol Syrup 125mg/5ml', category: 'Pediatrics', price: 5.50 },
  { name: 'ORS Powder Sachets', category: 'Pediatrics', price: 3.20 },
  { name: 'Zinc Syrup', category: 'Pediatrics', price: 6.00 },
  { name: 'Vitamin D Drops', category: 'Pediatrics', price: 10.00 },
  { name: 'Ibuprofen Syrup 100mg/5ml', category: 'Pediatrics', price: 6.80 },
  { name: 'Diazepam 5mg', category: 'Neurology', price: 9.00 },
  { name: 'Phenytoin 100mg', category: 'Neurology', price: 11.50 },
  { name: 'Levetiracetam 500mg', category: 'Neurology', price: 28.00 },
  { name: 'Carbamazepine 200mg', category: 'Neurology', price: 12.50 },
  { name: 'Amitriptyline 25mg', category: 'Neurology', price: 7.40 },
];

const PHARMACIES = [
  { name: 'CityCare Pharmacy', address: '12 Main Street, Downtown' },
  { name: 'MediPlus', address: '45 Oak Avenue, Midtown' },
  { name: 'QuickRx', address: '89 Pine Road, Eastside' },
  { name: 'Wellness Pharmacy', address: '3 Maple Lane, West End' },
  { name: '24/7 Drugstore', address: '101 Highway 10, Northside' },
  { name: 'Family Chemist', address: '77 River Road, Southside' },
  { name: 'Express Meds', address: '22 Station Plaza, Central' },
  { name: 'Trust Pharmacy', address: '5 Hillcrest Drive, Uptown' },
];

const CUSTOMER_FIRST = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen',
];

const BASE_DATE = new Date('2026-11-15');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(from, to) {
  return Math.ceil((new Date(to) - new Date(from)) / 86400000);
}

function rand(max) {
  return Math.floor(Math.random() * max);
}

function pick(arr) {
  return arr[rand(arr.length)];
}

const PRODUCTS = PRODUCT_TEMPLATES.map((t, i) => {
  const stock = rand(150);
  const minStock = [10, 12, 15, 18, 25][i % 5];
  const daysToExpiry = i % 6 === 0 ? 5 + rand(30) : 45 + rand(400);
  return {
    id: `prod-${String(i + 1).padStart(3, '0')}`,
    sku: `MF-${String(1000 + i)}`,
    name: t.name,
    category: t.category,
    price: t.price,
    stock,
    minStock,
    expiryDate: addDays(BASE_DATE, daysToExpiry),
    description: `${t.name} — ${t.category}. Prescription medicine.`,
  };
});

const CUSTOMERS = CUSTOMER_FIRST.map((first, i) => {
  const last = CUSTOMER_FIRST[(i + 7) % CUSTOMER_FIRST.length];
  return {
    id: `cust-${String(i + 1).padStart(3, '0')}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    phone: `+1-555-${String(100 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`,
    address: `${10 + i} ${pick(['Maple', 'Oak', 'Pine', 'Cedar', 'Elm'])} Street`,
    totalOrders: rand(9),
    totalSpent: Number((rand(500) + 50).toFixed(2)),
    lastOrder: addDays(BASE_DATE, -rand(120)),
  };
});

const STATUSES = ['Pending', 'Processing', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Partial'];
const METHODS = ['Cash', 'Card', 'Insurance', 'UPI'];

const ORDERS = Array.from({ length: 30 }, (_, i) => {
  const customer = pick(CUSTOMERS);
  const product = pick(PRODUCTS);
  const quantity = 1 + rand(4);
  const total = Number((product.price * quantity).toFixed(2));
  const daysAgo = rand(90);
  return {
    id: `ORD-${2400 + i}`,
    customerId: customer.id,
    customerName: customer.name,
    medicine: product.name,
    quantity,
    total,
    status: pick(STATUSES),
    paymentStatus: pick(PAYMENT_STATUSES),
    date: addDays(BASE_DATE, -daysAgo),
  };
});

const PAYMENTS = ORDERS.slice(0, 20).map((order, i) => ({
  id: `PAY-${300 + i}`,
  orderId: order.id,
  customerName: order.customerName,
  amount: order.total,
  method: pick(METHODS),
  status: i % 5 === 0 ? 'Pending' : i % 7 === 0 ? 'Failed' : 'Paid',
  date: order.date,
}));

function groupMonthlySales() {
  const months = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(BASE_DATE);
    d.setMonth(d.getMonth() - m);
    months.push(d.toISOString().slice(0, 7));
  }
  const data = {};
  months.forEach((key) => {
    data[key] = { sales: 0, orders: 0 };
  });
  ORDERS.forEach((order) => {
    const key = order.date.slice(0, 7);
    if (data[key]) {
      data[key].sales += order.total;
      data[key].orders += 1;
    }
  });
  return months.map((key) => ({
    month: new Date(`${key}-01`).toLocaleDateString(undefined, { month: 'short' }),
    sales: Number(data[key].sales.toFixed(2)),
    orders: data[key].orders,
  }));
}

const MONTHLY_SALES = groupMonthlySales();

const TOTAL_REVENUE = Number(
  ORDERS.reduce((sum, o) => sum + o.total, 0).toFixed(2)
);
const TOTAL_COST = Number((TOTAL_REVENUE * 0.6).toFixed(2));
const TOTAL_PROFIT = Number((TOTAL_REVENUE - TOTAL_COST).toFixed(2));
const AVG_ORDER_VALUE = Number((TOTAL_REVENUE / ORDERS.length).toFixed(2));

function ordersByTime() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  const data = {};
  days.forEach((d) => {
    hours.forEach((h) => {
      data[`${d}|${h}`] = 0;
    });
  });
  ORDERS.forEach((o) => {
    const d = new Date(o.date);
    const day = days[d.getDay() % 7];
    const hour = hours[Math.floor(d.getHours() / 4) % hours.length];
    const key = `${day}|${hour}`;
    if (data[key] !== undefined) data[key] += 1;
  });
  return days.flatMap((day) =>
    hours.map((hour) => ({ day, hour, value: data[`${day}|${hour}`] }))
  );
}

function topProducts() {
  const counts = {};
  ORDERS.forEach((o) => {
    if (!counts[o.medicine]) counts[o.medicine] = { units: 0, revenue: 0 };
    counts[o.medicine].units += o.quantity;
    counts[o.medicine].revenue += o.total;
  });
  return Object.entries(counts)
    .map(([name, v]) => ({ name, units: v.units, revenue: Number(v.revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
}

const LOW_STOCK_COUNT = PRODUCTS.filter((p) => p.stock <= p.minStock).length;
const EXPIRING_SOON_COUNT = PRODUCTS.filter(
  (p) => daysBetween(BASE_DATE, p.expiryDate) <= 30
).length;
const PENDING_ORDERS = ORDERS.filter((o) => o.status === 'Pending').length;

function topMedicines() {
  const counts = {};
  ORDERS.forEach((o) => {
    if (!counts[o.medicine]) counts[o.medicine] = { units: 0, sales: 0 };
    counts[o.medicine].units += o.quantity;
    counts[o.medicine].sales += o.total;
  });
  return Object.entries(counts)
    .map(([name, v]) => ({ name, units: v.units, sales: Number(v.sales.toFixed(2)) }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);
}

function salesByCategory() {
  const totals = {};
  ORDERS.forEach((o) => {
    const product = PRODUCTS.find((p) => p.name === o.medicine);
    if (!product) return;
    totals[product.category] = (totals[product.category] || 0) + o.total;
  });
  return CATEGORIES.map((cat) => ({
    category: cat,
    sales: Number((totals[cat] || 0).toFixed(2)),
  }));
}

export const OVERVIEW = {
  totalOrders: ORDERS.length,
  totalRevenue: TOTAL_REVENUE,
  totalCustomers: CUSTOMERS.length,
  lowStock: LOW_STOCK_COUNT,
  expiringSoon: EXPIRING_SOON_COUNT,
  pendingOrders: PENDING_ORDERS,
  monthlySales: MONTHLY_SALES,
  topMedicines: topMedicines(),
  recentOrders: ORDERS.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
};

export const SALES = {
  monthly: MONTHLY_SALES,
  byCategory: salesByCategory(),
  totalRevenue: TOTAL_REVENUE,
  totalProfit: TOTAL_PROFIT,
  totalCost: TOTAL_COST,
  totalOrders: ORDERS.length,
  avgOrderValue: AVG_ORDER_VALUE,
  ordersByTime: ordersByTime(),
  topProducts: topProducts(),
};

export const INSIGHTS = (() => {
  const restock = PRODUCTS.filter((p) => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock, sku: p.sku }));
  const expiring = PRODUCTS.filter((p) => {
    const days = daysBetween(BASE_DATE, p.expiryDate);
    return days <= 30 && days >= 0;
  })
    .map((p) => ({
      id: p.id,
      name: p.name,
      expiryDate: p.expiryDate,
      daysLeft: daysBetween(BASE_DATE, p.expiryDate),
      stock: p.stock,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return {
    summary: `You have ${restock.length} items below minimum stock and ${expiring.length} products expiring within 30 days. Prioritize restocking ${restock.length > 0 ? restock[0].name : 'critical items'} and promoting fast-expiring stock.`,
    restock,
    expiring,
  };
})();

export function findMedicineMock(q) {
  const query = (q || '').trim();
  const disclaimer =
    'MediFind is an emergency information tool, not a medical service. Always consult a licensed pharmacist or doctor before taking any medicine. Stock, prices and distances are estimates — confirm with the pharmacy before travelling.';
  if (!query) return { query: '', results: [], disclaimer };
  const results = PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )
    .slice(0, 8)
    .map((p, i) => {
      const pharmacy = PHARMACIES[i % PHARMACIES.length];
      return {
        id: p.id,
        medicine: p.name,
        pharmacy: pharmacy.name,
        address: pharmacy.address,
        price: p.price,
        stock: p.stock,
        distance: (0.4 + i * 0.7).toFixed(1) + ' km',
        urgency: p.stock <= 2 ? 'High' : p.stock <= 8 ? 'Medium' : 'Low',
      };
    });
  return { query, results, disclaimer };
}

const state = { products: [...PRODUCTS], orders: [...ORDERS], customers: [...CUSTOMERS], payments: [...PAYMENTS] };

export { state, PRODUCTS, ORDERS, CUSTOMERS, PAYMENTS, DELAY };
