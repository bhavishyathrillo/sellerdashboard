'use client';

interface KPICardsProps {
  metrics: {
    totalLeads: number;
    called: number;
    notCalled: number;
    avgDuration: number;
  };
  loading: boolean;
}

export default function KPICards({ metrics, loading }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Priority Leads',
      value: metrics.totalLeads,
      icon: '📋',
      color: 'bg-blue-500',
    },
    {
      title: 'Called',
      value: metrics.called,
      icon: '📞',
      color: 'bg-green-500',
    },
    {
      title: 'Not Called',
      value: metrics.notCalled,
      icon: '⏳',
      color: 'bg-yellow-500',
    },
    {
      title: 'Avg Call Duration (sec)',
      value: metrics.avgDuration,
      icon: '⏱️',
      color: 'bg-purple-500',
      format: (val: number) => val.toFixed(1),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{card.icon}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${card.color} text-white`}>
              KPI
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{card.title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {card.format ? card.format(card.value) : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}