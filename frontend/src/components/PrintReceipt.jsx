import { createPortal } from 'react-dom';

// The printed receipt for a New Sale. It is hidden on screen and is the only thing
// that prints (see "Printed receipt" in index.css). 72 mm wide, so it fits an 80 mm
// till printer and prints centred on A4, or can be saved as a PDF from the print window.
// receipt = the response of POST /api/pos/checkout (it includes the pharmacy details
// from the Settings page and the cashier's name).

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function PrintReceipt({ receipt }) {
  if (!receipt) return null;
  const ph = receipt.pharmacy || {};
  const place = [ph.address, ph.city].filter(Boolean).join(', ');
  const contact = [ph.phone && `Tel ${ph.phone}`, ph.whatsapp && `WhatsApp ${ph.whatsapp}`].filter(Boolean).join('  ·  ');
  const when = new Date(receipt.date);
  const walkIn = !receipt.customer?.name || receipt.customer.name === 'Walk-in customer';

  return createPortal(
    <div id="print-receipt" aria-hidden="true">
      <div className="r-center">
        <div className="r-name">{ph.name || 'Pharmacy'}</div>
        {place && <div>{place}</div>}
        {contact && <div>{contact}</div>}
        {ph.email && <div>{ph.email}</div>}
        {ph.license_number && <div>Licence: {ph.license_number}</div>}
      </div>

      <div className="r-rule" />
      <div className="r-row"><span>Receipt</span><span>#{receipt.receipt_no}</span></div>
      <div className="r-row"><span>Date</span><span>{when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
      {receipt.cashier && <div className="r-row"><span>Served by</span><span>{receipt.cashier}</span></div>}
      {!walkIn && <div className="r-row"><span>Customer</span><span>{receipt.customer.name}</span></div>}

      <div className="r-rule" />
      {receipt.items.map((l) => (
        <div key={l.product_id} className="r-item">
          <div>{l.name}</div>
          <div className="r-row r-sub"><span>{l.quantity} × {money(l.unit_price)}</span><span>{money(l.total)}</span></div>
        </div>
      ))}

      <div className="r-rule" />
      <div className="r-row r-total"><span>TOTAL</span><span>{money(receipt.total)}</span></div>
      <div className="r-row"><span>Paid by</span><span>{receipt.payment_method}</span></div>

      <div className="r-rule" />
      <div className="r-center r-foot">
        <div>Thank you for your purchase.</div>
        <div>Please keep this receipt.</div>
      </div>
    </div>,
    document.body
  );
}
