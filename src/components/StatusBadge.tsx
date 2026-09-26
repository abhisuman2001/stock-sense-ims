import React from 'react';
import { OperationStatus } from '../types';

interface StatusBadgeProps {
  status: OperationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  const getStyle = () => {
    switch (normalized) {
      case 'draft':
        return {
          bg: 'rgba(139, 132, 120, 0.15)',
          text: '#8B8478',
          border: 'rgba(139, 132, 120, 0.35)',
          dot: '#8B8478',
          label: 'DRAFT',
        };
      case 'waiting':
        return {
          bg: 'rgba(232, 163, 61, 0.15)',
          text: '#E8A33D',
          border: 'rgba(232, 163, 61, 0.4)',
          dot: '#E8A33D',
          label: 'WAITING',
        };
      case 'ready':
        return {
          bg: 'rgba(74, 144, 217, 0.15)',
          text: '#4A90D9',
          border: 'rgba(74, 144, 217, 0.4)',
          dot: '#4A90D9',
          label: 'READY',
        };
      case 'done':
        return {
          bg: 'rgba(95, 168, 93, 0.15)',
          text: '#5FA85D',
          border: 'rgba(95, 168, 93, 0.4)',
          dot: '#5FA85D',
          label: 'DONE',
        };
      case 'cancelled':
      case 'late':
        return {
          bg: 'rgba(217, 83, 79, 0.15)',
          text: '#D9534F',
          border: 'rgba(217, 83, 79, 0.4)',
          dot: '#D9534F',
          label: normalized === 'late' ? 'LATE' : 'CANCELLED',
        };
      default:
        return {
          bg: 'rgba(139, 132, 120, 0.15)',
          text: '#8B8478',
          border: 'rgba(139, 132, 120, 0.35)',
          dot: '#8B8478',
          label: status.toUpperCase(),
        };
    }
  };

  const style = getStyle();
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-semibold rounded-none border ${paddingClass}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: style.dot }}
      />
      {style.label}
    </span>
  );
};
