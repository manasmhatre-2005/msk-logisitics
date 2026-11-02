import React from 'react';

interface InvoiceWatermarkProps {
  opacity?: number; // Default 0.07 (7% opacity - within 5-10% corporate standard)
  maxWidth?: string; // Default 540px
  className?: string;
}

/**
 * Shared official MSK Logistic Solution Invoice Watermark Component
 * Renders subtly in the exact horizontal and vertical center of every invoice page,
 * strictly behind all text, tables, totals, signatures, and QR codes.
 */
export const InvoiceWatermark: React.FC<InvoiceWatermarkProps> = ({
  opacity = 0.07,
  maxWidth = '540px',
  className = '',
}) => {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
      style={{
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <img
        src="/images/msk-invoice-watermark.png"
        alt=""
        className="w-[74%] max-w-[540px] object-contain block select-none pointer-events-none"
        style={{
          opacity,
          maxWidth,
          aspectRatio: '2 / 1',
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'contrast(1.05)',
        }}
        onError={(e) => {
          // Graceful fallback if custom path is relocated
          const target = e.target as HTMLImageElement;
          if (target && !target.src.includes('msk-logo.png')) {
            target.src = '/images/msk-logo.png';
          }
        }}
      />
    </div>
  );
};
