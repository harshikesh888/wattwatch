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

const COLORS = ['#059669', '#d97706', '#7c3aed', '#0284c7', '#db2777', '#65a30d', '#e11d48', '#475569'];

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
    return <div className="p-6 text-sm text-slate-500">Waiting for first readings…</div>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} minTickGap={40} />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            domain={[0, 'auto']}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }}
            labelStyle={{ color: '#0f172a', fontWeight: 700 }}
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
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
