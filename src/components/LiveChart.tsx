import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtTime } from '../lib/calculations';
import { useEnergy } from '../lib/store';

const COLORS = ['#22d3ee', '#f59e0b', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fb7185', '#a3e635'];

export default function LiveChart() {
  const { rooms, readings } = useEnergy();

  const data = useMemo(() => {
    const base = readings[rooms[0]?.id ?? ''] ?? [];
    return base.map((r, i) => {
      const row: Record<string, number | string> = { t: fmtTime(r.timestamp) };
      for (const room of rooms) {
        const rd = readings[room.id]?.[i];
        row[room.name] = rd ? rd.power_kW : 0;
      }
      return row;
    });
  }, [readings, rooms]);

  if (data.length === 0) {
    return <div className="p-6 text-sm text-slate-400">Waiting for first readings…</div>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} minTickGap={40} />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            domain={[0, 'auto']}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {rooms.map((room, i) => (
            <Area
              key={room.id}
              type="monotone"
              dataKey={room.name}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
