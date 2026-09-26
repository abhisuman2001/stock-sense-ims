import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Off-White Light Mode'}
      aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Off-White Light Mode'}
      className={`group relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded transition-all duration-200 border cursor-pointer ${
        isLight
          ? 'bg-[#EAE6DF] hover:bg-[#E2DDD5] border-[#D1CCC2] text-[#2C2925] shadow-xs'
          : 'bg-[#262420] hover:bg-[#2E2B26] border-[#34312B] text-[#F2C230] shadow-xs'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isLight ? (
          <Sun className="w-4 h-4 text-[#D97706] transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-[#F2C230] transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>

      {showLabel ? (
        <span className="text-xs font-mono font-medium tracking-wide">
          {isLight ? 'LIGHT' : 'DARK'}
        </span>
      ) : (
        <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline-block font-semibold">
          {isLight ? 'OFF-WHITE' : 'DARK'}
        </span>
      )}
    </button>
  );
};
