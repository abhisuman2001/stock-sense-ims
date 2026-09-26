import React from 'react';
import { useTheme } from '../context/ThemeContext';

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
  // Gracefully detect active theme with fallback
  let isDark = true;
  try {
    const themeContext = useTheme();
    isDark = themeContext.theme === 'dark';
  } catch {
    if (typeof document !== 'undefined') {
      isDark = !document.documentElement.classList.contains('light');
    }
  }

  // Height sizing
  const sizeMap = {
    sm: { height: 26, cubeSize: 24, fontSize: 'text-base', badgeSize: 'text-[9px] px-1.5 py-0.5' },
    md: { height: 34, cubeSize: 32, fontSize: 'text-xl', badgeSize: 'text-[10px] px-2 py-0.5' },
    lg: { height: 42, cubeSize: 40, fontSize: 'text-2xl', badgeSize: 'text-xs px-2.5 py-1' },
    xl: { height: 52, cubeSize: 48, fontSize: 'text-3xl', badgeSize: 'text-sm px-3 py-1' },
  };

  const currentSize = sizeMap[size];

  // Theme-adaptive color palette
  const colors = {
    stockText: isDark ? 'text-[#FFFFFF]' : 'text-[#141312]',
    senseText: isDark ? 'text-[#818CF8]' : 'text-[#4F46E5]',
    badgeBg: isDark ? 'bg-[#23232C]' : 'bg-[#E2DDD3]',
    badgeText: isDark ? 'text-[#9CA3AF]' : 'text-[#38342D]',
    badgeBorder: isDark ? 'border-[#353748]' : 'border-[#C8C2B5]',
    subtitleText: isDark ? 'text-[#8B8478]' : 'text-[#5C5549]',
    // Cube colors: in light mode, dark faces with crisp borders and soft shadow provide high contrast
    cubeTop: isDark ? '#262734' : '#222330',
    cubeLeft: isDark ? '#1A1B24' : '#171822',
    cubeRight: isDark ? '#12131C' : '#0F1018',
    cubeStroke: isDark ? '#3F4255' : '#303242',
    cubeShadow: isDark
      ? 'drop-shadow-sm'
      : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]',
  };

  // Standalone isometric cube vector
  const CubeIcon = (
    <svg
      width={currentSize.cubeSize}
      height={currentSize.cubeSize}
      viewBox="0 0 40 40"
      fill="none"
      className={`shrink-0 select-none transition-all duration-200 ${colors.cubeShadow}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`cubeGrad_${size}_${isDark ? 'dark' : 'light'}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00E599" />
          <stop offset="100%" stopColor={isDark ? '#818CF8' : '#6366F1'} />
        </linearGradient>
      </defs>

      {/* Top Face */}
      <path
        d="M20 2 L37 11.5 L20 21 L3 11.5 Z"
        fill={colors.cubeTop}
        stroke={colors.cubeStroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Left Face */}
      <path
        d="M3 11.5 L20 21 L20 38 L3 28.5 Z"
        fill={colors.cubeLeft}
        stroke={colors.cubeStroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Right Face */}
      <path
        d="M20 21 L37 11.5 L37 28.5 L20 38 Z"
        fill={colors.cubeRight}
        stroke={colors.cubeStroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Connected Circuit Line */}
      <line
        x1="9"
        y1="26"
        x2="28"
        y2="17"
        stroke={`url(#cubeGrad_${size}_${isDark ? 'dark' : 'light'})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* White Node (upper left) */}
      <circle cx="16" cy="10" r="2.2" fill="#FFFFFF" />

      {/* Green Node (lower left) */}
      <circle cx="9" cy="26" r="2.8" fill="#00E599" />

      {/* Purple / Periwinkle Node (mid right) */}
      <circle cx="28" cy="17" r="2.8" fill={isDark ? '#818CF8' : '#6366F1'} />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{CubeIcon}</div>;
  }

  return (
    <div className={`stocksense-logo inline-flex items-center gap-2.5 select-none ${className}`}>
      {CubeIcon}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 leading-none">
          <span
            className={`stocksense-logo-text-stock font-bold tracking-tight transition-colors duration-200 ${colors.stockText} ${currentSize.fontSize}`}
          >
            Stock
          </span>
          <span
            className={`stocksense-logo-text-sense font-bold tracking-tight transition-colors duration-200 ${colors.senseText} ${currentSize.fontSize}`}
          >
            Sense
          </span>

          {variant === 'full' && (
            <span
              className={`stocksense-logo-badge font-mono font-semibold uppercase tracking-wider rounded border transition-colors duration-200 ${colors.badgeBg} ${colors.badgeText} ${colors.badgeBorder} ${currentSize.badgeSize}`}
            >
              IMS
            </span>
          )}
        </div>
        {showSubtitle && (
          <span
            className={`stocksense-logo-subtitle text-[10px] font-mono tracking-wider uppercase mt-0.5 transition-colors duration-200 ${colors.subtitleText}`}
          >
            Industrial Warehouse Logistics
          </span>
        )}
      </div>
    </div>
  );
};
