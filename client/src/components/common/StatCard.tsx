import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  trend?: string;
  variant?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  variant = 'red',
  onClick,
}) => {
  const iconVariants = {
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-red-300' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg border ${iconVariants[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {(subtext || trend) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
