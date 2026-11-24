// Weekly summary: the last 7 days compared with the 7 days before, written out
// as a short plain message the owner can send to themselves by WhatsApp or email.
// Every figure is counted from the pharmacy's own records with fixed rules; no AI
// writes or changes the numbers.
import { TIME_ZONE, localParts } from './time.js';

const DAY = 86400000;
const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const FULL_DAY = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// One checkout saves one order row per medicine, all with the same time and customer,
// so those rows are counted as one sale
const saleKey = (o) => `${o.order_date}|${o.customer_id}`;

function sum(orders) {
  return {
    revenue: round2(orders.reduce((s, o) => s + o.total, 0)),
    sales: new Set(orders.map(saleKey)).size,
    units: orders.reduce((s, o) => s + (Number(o.quantity) || 0), 0),
  };
}

// orders: loadOrders() rows. forecast: forecastStock() result.
// stock: { low, expiring, expired, expiryDays }. pharmacy: { name }.
export function weeklySummary({ orders, forecast, stock, pharmacy, now = new Date() }) {
  const t = now.getTime();
  const valid = orders.filter((o) => o.order_status !== 'Cancelled');
  const inRange = (o, from, to) => {
    const at = new Date(o.order_date).getTime();
    return at > from && at <= to;
  };
  const week = valid.filter((o) => inRange(o, t - 7 * DAY, t));
  const before = valid.filter((o) => inRange(o, t - 14 * DAY, t - 7 * DAY));
  const thisWeek = sum(week);
  const lastWeek = sum(before);
  const change = lastWeek.revenue > 0 ? Math.round(((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100) : null;

  const units = new Map();
  for (const o of week) units.set(o.product_name, (units.get(o.product_name) || 0) + (Number(o.quantity) || 0));
  const best = [...units.entries()]
    .map(([name, qty]) => ({ name, quantity: qty }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, 3);

  const byDay = new Map();
  for (const o of week) {
    const d = localParts(o.order_date);
    if (d) byDay.set(d.weekday, (byDay.get(d.weekday) || 0) + o.total);
  }
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];

  const byCashier = new Map();
  for (const o of week) {
    if (!o.cashier_name) continue;
    byCashier.set(o.cashier_name, round2((byCashier.get(o.cashier_name) || 0) + o.total));
  }
  const cashiers = [...byCashier.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const runningOut = (forecast?.items || []).filter((x) => x.days_left <= 7).slice(0, 5);

  const from = new Date(t - 6 * DAY);
  const period = `${dayMonth.format(from)} to ${dayMonthYear.format(now)}`;

  // ----- the message -----
  const lines = [`MediFind weekly summary: ${pharmacy?.name || 'your pharmacy'}`, period, ''];
  if (thisWeek.sales === 0) {
    lines.push('No sales were recorded this week.');
  } else {
    let compare = '';
    if (change === null) compare = lastWeek.sales ? '' : ' There were no sales the week before.';
    else if (change > 0) compare = ` That is ${change}% more than the week before (${money(lastWeek.revenue)}).`;
    else if (change < 0) compare = ` That is ${-change}% less than the week before (${money(lastWeek.revenue)}).`;
    else compare = ' The same as the week before.';
    lines.push(`Sales: ${money(thisWeek.revenue)} from ${plural(thisWeek.sales, 'sale')}.${compare}`);
    if (best.length) lines.push(`Best sellers: ${best.map((b) => `${b.name} (${b.quantity})`).join(', ')}.`);
    if (busiest) lines.push(`Busiest day: ${FULL_DAY[busiest[0]] || busiest[0]}.`);
    if (cashiers.length > 1) lines.push(`By staff: ${cashiers.map((c) => `${c.name} ${money(c.revenue)}`).join(', ')}.`);
  }
  lines.push('');
  if (runningOut.length) {
    lines.push('Running out within a week:');
    for (const x of runningOut) {
      lines.push(`- ${x.days_left === 0 ? `${x.name}: ${x.quantity ? 'today' : 'out of stock'}` : `${x.name}: about ${plural(x.days_left, 'day')}`}`);
    }
  } else {
    lines.push('Nothing is expected to run out within a week.');
  }
  lines.push(`Low or out of stock: ${plural(stock?.low || 0, 'product')}.`);
  if (stock?.expiring) lines.push(`Expiring within ${stock.expiryDays} days: ${plural(stock.expiring, 'product')}.`);
  if (stock?.expired) lines.push(`Already expired: ${plural(stock.expired, 'product')}. Take ${stock.expired === 1 ? 'it' : 'them'} off the shelf.`);

  return {
    period,
    this_week: thisWeek,
    last_week: lastWeek,
    change_percent: change,
    best_sellers: best,
    busiest_day: busiest ? FULL_DAY[busiest[0]] || busiest[0] : null,
    by_staff: cashiers,
    running_out: runningOut,
    stock: { low: stock?.low || 0, expiring: stock?.expiring || 0, expired: stock?.expired || 0, expiry_days: stock?.expiryDays },
    text: lines.join('\n'),
  };
}
