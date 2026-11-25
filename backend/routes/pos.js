import { Router } from 'express';
import * as sb from '../lib/supabase.js';
import { adjustStock, restoreStock } from '../lib/stock.js';
import { staffName } from '../lib/auth.js';
import { selectAll } from '../lib/selectAll.js';
import { askGemini } from '../lib/gemini.js';
import { readSaleNote, MAX_NOTE } from '../lib/saleNote.js';
import { resolveCustomer, WALK_IN } from '../lib/customers.js';

const supabase = sb.supabase || sb.default;
const router = Router();

const METHODS = ['Cash', 'EcoCash', 'Card', 'Bank Transfer'];
const round2 = (n) => Math.round(n * 100) / 100;
const clean = (v) => String(v ?? '').trim();

// POST /api/pos/note  { note: "2 paracetamol and 1 amoxicillin for Tendai" }
// Finds the medicines in this pharmacy's products for the till operator to check.
// It does not sell anything or change stock.
router.post('/note', async (req, res) => {
  try {
    const note = clean(req.body?.note);
    if (!note) return res.status(400).json({ error: 'Type what the customer wants first' });
    if (note.length > MAX_NOTE) return res.status(400).json({ error: `Keep the note under ${MAX_NOTE} characters` });
    const products = await selectAll(() => req.pharmacy.select('products', 'id, name, price, quantity'));
    // the AI is only asked when there is a key; otherwise the plain rules read the note
    const ask = process.env.GEMINI_API_KEY ? askGemini : undefined;
    res.json(await readSaleNote(note, products, { ask }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/checkout
// { customer_id?, customer_name, phone, email, payment_method, items: [{ product_id, quantity }] }
// customer_id = a customer picked from the suggestions (see lib/customers.js for the rest)
router.post('/checkout', async (req, res) => {
  try {
    const name = clean(req.body?.customer_name) || WALK_IN;
    const phone = clean(req.body?.phone);
    const email = clean(req.body?.email).toLowerCase();
    const method = METHODS.includes(req.body?.payment_method) ? req.body.payment_method : 'Cash';

    // Merge duplicate lines and ignore bad ones
    const wanted = new Map();
    for (const it of Array.isArray(req.body?.items) ? req.body.items : []) {
      const id = it?.product_id;
      const q = Math.floor(Number(it?.quantity));
      if (!id || !(q > 0)) continue;
      wanted.set(id, (wanted.get(id) || 0) + q);
    }
    if (wanted.size === 0) return res.status(400).json({ error: 'Add at least one medicine to the sale' });
    if (wanted.size > 50) return res.status(400).json({ error: 'Too many items in one sale' });

    // only this pharmacy's products can be sold
    const pharmacyId = req.pharmacy.id;
    const { data: products, error: pe } = await req.pharmacy
      .select('products', '*')
      .in('id', [...wanted.keys()]);
    if (pe) throw pe;
    const pMap = new Map((products || []).map((p) => [p.id, p]));

    for (const id of wanted.keys()) {
      if (!pMap.has(id)) return res.status(404).json({ error: 'One of the medicines no longer exists' });
    }

    // Work out the customer before touching stock: a phone number or email saved for
    // someone with a different name stops here (409) so the till operator can choose
    const who = await resolveCustomer(req.pharmacy, {
      customerId: clean(req.body?.customer_id) || null,
      name,
      phone,
      email,
    });

    // Take the stock for every line first. adjustStock refuses (400) if there is not
    // enough, even when another sale happens at the same moment.
    const taken = [];
    try {
      for (const [id, q] of wanted) {
        await adjustStock(id, -q, { pharmacyId });
        taken.push([id, q]);
      }
    } catch (err) {
      for (const [id, q] of taken) await restoreStock(id, q, pharmacyId);
      throw err;
    }

    const now = new Date().toISOString();
    const lines = [];
    const orderIds = [];
    let customer;
    let created;

    try {
      created = Boolean(who.create);
      if (who.create) {
        const { data: made, error: ce } = await req.pharmacy.insert('customers', who.create).select().single();
        if (ce) throw ce;
        customer = made;
      } else {
        customer = who.customer;
        // save a phone number or email they did not have yet
        if (who.update) {
          const { error: ue } = await req.pharmacy.update('customers', who.update).eq('id', customer.id);
          if (ue) throw ue;
          customer = { ...customer, ...who.update };
        }
      }

      for (const [id, q] of wanted) {
        const p = pMap.get(id);
        const price = Number(p.price) || 0;
        const total = round2(price * q);

        const { data: order, error: oe } = await req.pharmacy
          .insert('orders', {
            customer_id: customer.id,
            product_id: id,
            quantity: q,
            total,
            order_date: now,
            status: 'Completed',
            payment_status: 'Paid',
            cashier_id: req.user.id,
            cashier_name: staffName(req),
          })
          .select('id')
          .single();
        if (oe) throw oe;
        orderIds.push(order.id);

        const { error: payErr } = await req.pharmacy.insert('payments', {
          order_id: order.id,
          amount: total,
          status: 'Completed',
          method,
          payment_date: now,
        });
        if (payErr) throw payErr;

        lines.push({ product_id: id, name: p.name, quantity: q, unit_price: price, total });
      }
    } catch (err) {
      // Undo the whole sale so nothing is half-saved
      if (orderIds.length) {
        await req.pharmacy.delete('payments').in('order_id', orderIds);
        await req.pharmacy.delete('orders').in('id', orderIds);
      }
      for (const [id, q] of taken) await restoreStock(id, q, pharmacyId);
      if (created && customer?.id) await req.pharmacy.delete('customers').eq('id', customer.id);
      throw err;
    }
    const firstOrderId = String(orderIds[0] || '');

    // pharmacy details for the printed receipt (Settings page)
    const { data: ph } = await supabase
      .from('pharmacies')
      .select('name, address, city, phone, whatsapp, email, license_number')
      .eq('id', pharmacyId)
      .limit(1);

    res.status(201).json({
      pharmacy: ph?.[0] || null,
      cashier: staffName(req),
      receipt_no: firstOrderId.slice(0, 8).toUpperCase(),
      date: now,
      customer: { id: customer.id, name: customer.name, phone: customer.phone || '', email: customer.email || '' },
      customer_created: created,
      payment_method: method,
      items: lines,
      total: round2(lines.reduce((s, l) => s + l.total, 0)),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, ...(err.extra || {}) });
  }
});

export default router;
