import React, { useEffect } from 'react';
import {
  X,
  Box,
  Receipt,
  Truck,
  Ship,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { BillType, BILL_TYPE_LIST } from '../../types/index';

interface BillTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBillType: (billType: BillType) => void;
}

export const BillTypeSelectionModal: React.FC<BillTypeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectBillType,
}) => {
  // Support Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Icon mapping for each bill type
  const getIcon = (id: BillType) => {
    switch (id) {
      case 'EMPTY_CONTAINER':
        return Box;
      case 'CREDIT_NOTE':
        return Receipt;
      case 'HT_BILL':
        return Truck;
      case 'FORWARDING':
        return Ship;
      default:
        return FileText;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-red-50/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-900/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-100/70 px-2 py-0.5 rounded">
                    MSK LOGISTIC SOLUTION ERP
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
                  Select Bill Type
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a billing category to proceed with invoice creation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bill Options List */}
          <div className="p-6 space-y-3">
            {BILL_TYPE_LIST.map((option, idx) => {
              const Icon = getIcon(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => onSelectBillType(option.id)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200/90 hover:border-red-500 bg-white hover:bg-red-50/20 hover:shadow-md transition-all duration-150 flex items-center justify-between gap-4 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Icon in branded box */}
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all shadow-2xs">
                      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                          {option.label}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 group-hover:bg-red-100 group-hover:text-red-700 px-1.5 py-0.5 rounded transition-colors">
                          0{option.orderNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate leading-relaxed">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right Arrow indicator */}
                  <div className="shrink-0 pl-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-red-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all group-hover:translate-x-0.5">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Phase 1: Selected bill type applies to this invoice workflow</span>
            </div>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
