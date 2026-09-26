import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabels = true }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span
          className={`text-[11px] font-mono font-medium transition-colors select-none ${
            !isDark ? 'text-[#B47805] font-bold' : 'text-[#8B8478]'
          }`}
        >
          LIGHT
        </span>
      )}

      {/* Switch Track */}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        title={isDark ? 'Toggle to Off-White Light Mode' : 'Toggle to Industrial Dark Mode'}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full p-0.5 border transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C230] ${
          isDark
            ? 'bg-[#121110] border-[#F2C230]/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
            : 'bg-[#DCD6CA] border-[#CEC7B8] shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]'
        }`}
      >
        {/* Track internal icons for visual clarity */}
        <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${!isDark ? 'text-[#D97706] opacity-100' : 'text-[#8B8478]/40 opacity-40'}`} />
          <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'text-[#F2C230] opacity-100' : 'text-[#8B8478]/40 opacity-40'}`} />
        </span>

        {/* Sliding Thumb Knob */}
        <span
          className={`pointer-events-none flex h-5.5 w-5.5 transform items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-in-out ${
            isDark
              ? 'translate-x-7 bg-[#262420] border border-[#F2C230] text-[#F2C230]'
              : 'translate-x-0 bg-[#FDFCFA] border border-[#D8D2C5] text-[#D97706]'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 fill-[#F2C230]/20" />
          ) : (
            <Sun className="w-3 h-3 fill-[#D97706]/20" />
          )}
        </span>
      </button>

      {showLabels && (
        <span
          className={`text-[11px] font-mono font-medium transition-colors select-none ${
            isDark ? 'text-[#F2C230] font-bold' : 'text-[#8B8478]'
          }`}
        >
          DARK
        </span>
      )}
    </div>
  );
};
