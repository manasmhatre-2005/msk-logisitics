import React from 'react';
import { Calendar, HelpCircle, AlertCircle, Edit3 } from 'lucide-react';
import { Badge } from './Badge';

interface DateCalculationBoxProps {
  emptyDays: number;
  cartingDays: number;
  loadedDays: number;
  isOverride: boolean;
  overrideReason?: string;
  explanation?: {
    emptyRentFormula?: string;
    cartingDaysFormula?: string;
    loadedRentFormula?: string;
  };
  onToggleOverride?: (override: boolean) => void;
  onOverrideChange?: (field: 'empty' | 'carting' | 'loaded' | 'reason', val: any) => void;
  readOnly?: boolean;
}

export const DateCalculationBox: React.FC<DateCalculationBoxProps> = ({
  emptyDays,
  cartingDays,
  loadedDays,
  isOverride,
  overrideReason,
  explanation,
  onToggleOverride,
  onOverrideChange,
  readOnly = false,
}) => {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
            Automated Operational Day Calculations
          </h4>
          {isOverride && (
            <Badge variant="amber" size="sm">
              <AlertCircle className="w-3 h-3" /> Manual Override
            </Badge>
          )}
        </div>
        {!readOnly && onToggleOverride && (
          <button
            type="button"
            onClick={() => onToggleOverride(!isOverride)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isOverride ? 'Reset to Auto Calc' : 'Enable Manual Override'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Empty Ground Rent */}
        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Empty Ground Rent</span>
            <span title={explanation?.emptyRentFormula || 'Empty Gate-In to Stuffing minus free days'}>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          {isOverride && !readOnly && onOverrideChange ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={emptyDays}
                onChange={(e) => onOverrideChange('empty', parseInt(e.target.value) || 0)}
                className="w-16 rounded border border-amber-300 px-2 py-1 text-sm font-bold text-amber-900 focus:outline-blue-500"
              />
              <span className="text-xs text-slate-500">Days</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-900">
              {emptyDays} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {explanation?.emptyRentFormula || 'Gate-In to Stuffing (Less 3 Free Days)'}
          </p>
        </div>

        {/* Days After Carting */}
        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Days After Carting</span>
            <span title={explanation?.cartingDaysFormula || 'Carting Date to Stuffing / LDD Out'}>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          {isOverride && !readOnly && onOverrideChange ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={cartingDays}
                onChange={(e) => onOverrideChange('carting', parseInt(e.target.value) || 0)}
                className="w-16 rounded border border-amber-300 px-2 py-1 text-sm font-bold text-amber-900 focus:outline-blue-500"
              />
              <span className="text-xs text-slate-500">Days</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-900">
              {cartingDays} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {explanation?.cartingDaysFormula || 'Carting Date to LDD Out'}
          </p>
        </div>

        {/* Loaded Ground Days */}
        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Loaded Ground Days</span>
            <span title={explanation?.loadedRentFormula || 'Stuffing to LDD Out minus free days'}>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          {isOverride && !readOnly && onOverrideChange ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={loadedDays}
                onChange={(e) => onOverrideChange('loaded', parseInt(e.target.value) || 0)}
                className="w-16 rounded border border-amber-300 px-2 py-1 text-sm font-bold text-amber-900 focus:outline-blue-500"
              />
              <span className="text-xs text-slate-500">Days</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-900">
              {loadedDays} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {explanation?.loadedRentFormula || 'Stuffing to LDD Out (Less 5 Free Days)'}
          </p>
        </div>
      </div>

      {isOverride && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-amber-900 mb-1">
            Reason for Manual Override <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={readOnly}
            value={overrideReason || ''}
            onChange={(e) => onOverrideChange?.('reason', e.target.value)}
            placeholder="e.g. Free storage extension approved by Port Master"
            className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-amber-500"
          />
        </div>
      )}
    </div>
  );
};
