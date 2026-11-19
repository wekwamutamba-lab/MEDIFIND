export default function SearchInput({ placeholder = 'Search…', value, onChange }) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9F26B] focus:border-[#D9F26B]"
    />
  );
}
