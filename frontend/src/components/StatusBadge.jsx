const COLORS = {
  Pending: 'amber',
  Processing: 'blue',
  Delivered: 'green',
  Cancelled: 'red',
  Paid: 'green',
  Unpaid: 'amber',
  Failed: 'red',
  Partial: 'amber',
  High: 'red',
  Medium: 'amber',
  Low: 'green',
  'In Stock': 'green',
  'Low Stock': 'amber',
  'Out of Stock': 'red',
};

export default function StatusBadge({ status }) {
  const color = COLORS[status] || 'gray';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-medium border-${color}-200 bg-${color}-100 text-${color}-700`}>
      {status}
    </span>
  );
}
