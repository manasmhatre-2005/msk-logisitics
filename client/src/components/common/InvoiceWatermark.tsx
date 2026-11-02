import React from 'react';

interface InvoiceWatermarkProps {
  opacity?: number; // Default 0.14 (14% opacity - bold, prominent corporate watermark)
  maxWidth?: string; // Default 640px
  className?: string;
}

/**
 * Shared official MSK Logistic Solution Invoice Watermark Component
 * Renders prominently in the exact horizontal and vertical center of every invoice page,
 * strictly behind all text, tables, totals, signatures, and QR codes.
 */
export const InvoiceWatermark: React.FC<InvoiceWatermarkProps> = ({
  opacity = 0.14,
  maxWidth = '640px',
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
        className="w-[84%] max-w-[640px] object-contain block select-none pointer-events-none"
        style={{
          opacity,
          maxWidth,
          aspectRatio: '2 / 1',
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'contrast(1.15) saturate(1.1)',
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
