import React from 'react';

interface StockSenseLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

export const StockSenseLogo: React.FC<StockSenseLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showSubtitle = false,
}) => {
  // Height sizing
  const sizeMap = {
    sm: { height: 26, cubeSize: 24, fontSize: 'text-base', badgeSize: 'text-[9px] px-1.5 py-0.5' },
    md: { height: 34, cubeSize: 32, fontSize: 'text-xl', badgeSize: 'text-[10px] px-2 py-0.5' },
    lg: { height: 42, cubeSize: 40, fontSize: 'text-2xl', badgeSize: 'text-xs px-2.5 py-1' },
    xl: { height: 52, cubeSize: 48, fontSize: 'text-3xl', badgeSize: 'text-sm px-3 py-1' },
  };

  const currentSize = sizeMap[size];

  // Standalone isometric cube vector
  const CubeIcon = (
    <svg
      width={currentSize.cubeSize}
      height={currentSize.cubeSize}
      viewBox="0 0 40 40"
      fill="none"
      className="shrink-0 drop-shadow-sm select-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`cubeGrad_${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00E599" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      {/* Top Face */}
      <path
        d="M20 2 L37 11.5 L20 21 L3 11.5 Z"
        fill="#262734"
        stroke="#3F4255"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Left Face */}
      <path
        d="M3 11.5 L20 21 L20 38 L3 28.5 Z"
        fill="#1A1B24"
        stroke="#3F4255"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Right Face */}
      <path
        d="M20 21 L37 11.5 L37 28.5 L20 38 Z"
        fill="#12131C"
        stroke="#3F4255"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Connected Circuit Line */}
      <line
        x1="9"
        y1="26"
        x2="28"
        y2="17"
        stroke={`url(#cubeGrad_${size})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* White Node (upper left) */}
      <circle cx="16" cy="10" r="2.2" fill="#FFFFFF" />

      {/* Green Node (lower left) */}
      <circle cx="9" cy="26" r="2.8" fill="#00E599" />

      {/* Purple / Periwinkle Node (mid right) */}
      <circle cx="28" cy="17" r="2.8" fill="#818CF8" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{CubeIcon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {CubeIcon}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 leading-none">
          <span className={`font-bold tracking-tight text-[#FFFFFF] ${currentSize.fontSize}`}>
            Stock
          </span>
          <span className={`font-bold tracking-tight text-[#818CF8] ${currentSize.fontSize}`}>
            Sense
          </span>

          {variant === 'full' && (
            <span
              className={`font-mono font-semibold uppercase tracking-wider bg-[#23232C] text-[#9CA3AF] border border-[#353748] rounded ${currentSize.badgeSize}`}
            >
              IMS
            </span>
          )}
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-mono text-[#8B8478] tracking-wider uppercase mt-0.5">
            Industrial Warehouse Logistics
          </span>
        )}
      </div>
    </div>
  );
};
