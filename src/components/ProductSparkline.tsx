import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface SparklinePoint {
  day: string;
  qty: number;
}

interface ProductSparklineProps {
  data: SparklinePoint[];
  isLow: boolean;
  uom: string;
}

export const ProductSparkline: React.FC<ProductSparklineProps> = ({ data, isLow, uom }) => {
  // If no change or constant data, still render a clean line
  const color = isLow ? '#E8A33D' : '#5FA85D';
  const minVal = Math.min(...data.map((d) => d.qty));
  const maxVal = Math.max(...data.map((d) => d.qty));
  const padding = maxVal === minVal ? Math.max(1, maxVal * 0.1) : (maxVal - minVal) * 0.15;
  const domainMin = Math.max(0, Math.floor(minVal - padding));
  const domainMax = Math.ceil(maxVal + padding);

  const startQty = data[0]?.qty ?? 0;
  const endQty = data[data.length - 1]?.qty ?? 0;
  const diff = endQty - startQty;
  const trendSign = diff > 0 ? '+' : '';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-7">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as SparklinePoint;
                  return (
                    <div className="bg-[#1A1816] border border-[#34312B] px-2 py-1 text-[10px] font-mono text-[#F5F3EF] shadow-lg rounded">
                      <span className="text-[#8B8478]">{item.day}: </span>
                      <span className="font-bold text-[#F2C230]">
                        {item.qty.toFixed(1)} {uom}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="qty"
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <span
        title={`7-Day net quantity delta: ${trendSign}${diff.toFixed(1)} ${uom}`}
        className={`text-[10px] font-mono tabular-nums font-semibold ${
          diff > 0 ? 'text-[#5FA85D]' : diff < 0 ? 'text-[#E8A33D]' : 'text-[#8B8478]'
        }`}
      >
        {trendSign}
        {diff.toFixed(0)}
      </span>
    </div>
  );
};
