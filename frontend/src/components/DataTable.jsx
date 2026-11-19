import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({ columns, data, pageSize = 10, onAction }) {
  const [page, setPage] = useState(1);
  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  const slice = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium" scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {slice.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                No records found
              </td>
            </tr>
          ) : (
            slice.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition">
                {columns.map((col) => {
                  if (col.key === 'actions') {
                    return (
                      <td key="actions" className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.actions || ['view', 'edit', 'delete'].map((action) => {
                            const Icon =
                              action === 'view' ? ViewIcon :
                              action === 'edit' ? EditIcon : TrashIcon;
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => onAction && onAction(action, row)}
                                className="p-1.5 rounded text-gray-500 hover:text-[#0F3D2E] hover:bg-gray-100 transition"
                                title={action}
                              >
                                <Icon size={16} />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  }
                  const value = col.render ? col.render(row) : row[col.key];
                  return (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between text-xs text-gray-500">
        <div>
          Showing <b>{Math.min((currentPage - 1) * pageSize + 1, total)}</b> to{' '}
          <b>{Math.min(currentPage * pageSize, total)}</b> of <b>{total}</b>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
          >
            <ChevronLeft size={14} />
          </button>
          <span>Page {currentPage} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={currentPage === pages}
            className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewIcon({ size = 16 }) {
  return (
    <svg className="w-4 h-4" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EditIcon({ size = 16 }) {
  return (
    <svg className="w-4 h-4" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function TrashIcon({ size = 16 }) {
  return (
    <svg className="w-4 h-4" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
