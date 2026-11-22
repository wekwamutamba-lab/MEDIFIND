export default function StatCard({ title, value, sublabel, Icon, variant = 'default' }) {
  const green = variant === 'green';
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${green ? 'bg-sidebar text-white border-sidebar/40' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg ${green ? 'bg-lime text-sidebar' : 'bg-gray-100 text-gray-500'}`}>
            <Icon size={20} />
          </div>
        )}
        <div>
          <p className={green ? 'text-lime-100 text-sm font-medium' : 'text-gray-500 text-sm font-medium'}>{title}</p>
        </div>
        <div>
          <p className={green ? 'text-white text-2xl font-bold' : 'text-gray-900 text-lg font-bold'}>{value}</p>
          {sublabel && (
            <p className={green ? 'text-lime-200 text-xs' : 'text-gray-400 text-xs'}>{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
