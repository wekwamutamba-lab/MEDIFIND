// The table area of a list page: shows an error with Retry, a loading placeholder,
// an empty message, or the table itself. The rest of the page (title, stats, search,
// filters and modals) stays on screen in every state.
export default function ListBody({ loading, error, onRetry, isEmpty, emptyText = 'Nothing found.', children }) {
  return (
    <>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <span className="text-red-700 text-sm flex-1">{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded text-sm text-sidebar underline hover:text-sidebar/80"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {isEmpty && loading && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-48 h-8 rounded bg-gray-200"></div>
            <div className="w-64 h-4 rounded bg-gray-200"></div>
          </div>
        </div>
      )}

      {isEmpty && !loading && !error && (
        <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">{emptyText}</p>
        </div>
      )}

      {!isEmpty && (
        <div
          className={`rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}
          aria-busy={loading}
        >
          {children}
        </div>
      )}
    </>
  );
}
