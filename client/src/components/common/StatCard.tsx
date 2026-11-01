import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  trend?: string;
  variant?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate' | 'purple' | 'indigo';
  accentBorder?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate' | 'indigo';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  variant = 'blue',
  accentBorder = 'blue',
  onClick,
}) => {
  const iconVariants = {
    red: 'bg-red-50 text-[#F5222D] border-red-100',
    blue: 'bg-blue-50 text-[#168BFF] border-blue-100',
    indigo: 'bg-indigo-50 text-[#6366F1] border-indigo-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-[#FF941F] border-amber-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const accentBorderClass = {
    red: 'border-l-4 border-l-[#F5222D]',
    blue: 'border-l-4 border-l-[#168BFF]',
    indigo: 'border-l-4 border-l-[#6366F1]',
    emerald: 'border-l-4 border-l-[#00D6B0]',
    amber: 'border-l-4 border-l-[#FF941F]',
    slate: 'border-l-4 border-l-[#315873]',
  }[accentBorder || 'blue'];

  // Bottom soft atmospheric wave gradient colors
  const waveColors = {
    red: 'from-red-200/50 via-red-100/30 to-transparent',
    blue: 'from-blue-200/50 via-blue-100/30 to-transparent',
    indigo: 'from-indigo-200/50 via-indigo-100/30 to-transparent',
    purple: 'from-purple-200/50 via-purple-100/30 to-transparent',
    emerald: 'from-emerald-200/50 via-emerald-100/30 to-transparent',
    amber: 'from-amber-200/50 via-amber-100/30 to-transparent',
    slate: 'from-slate-200/50 via-slate-100/30 to-transparent',
  }[variant || 'blue'];

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl border border-[#D8E2ED] bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] overflow-hidden select-none ${accentBorderClass} ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      {/* Subtle curved atmospheric glow wave at the bottom of the card */}
      <div
        className={`absolute bottom-0 right-0 w-36 h-16 bg-gradient-to-tl ${waveColors} rounded-tl-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`}
      />

      {/* Header: Title and Icon */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#14263D]">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${iconVariants[variant]} shadow-2xs group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="relative z-10 mt-3.5">
        <div className="text-3xl font-black text-[#14263D] tracking-tight leading-none">
          {value}
        </div>
        {(subtext || trend) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#62758A]">
            {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
