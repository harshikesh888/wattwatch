import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { efficiencyScore } from '../lib/calculations';
import { useEnergy } from '../lib/store';

export default function Leaderboard() {
  const { rooms, wasteByRoom } = useEnergy();

  const rows = useMemo(
    () =>
      rooms
        .map((r) => ({
          id: r.id,
          name: r.name,
          waste: wasteByRoom[r.id] ?? 0,
          score: efficiencyScore(wasteByRoom[r.id] ?? 0),
        }))
        .sort((a, b) => a.waste - b.waste),
    [rooms, wasteByRoom],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2 text-right">Wasted</th>
              <th className="px-4 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-black ${
                      i === 0
                        ? 'bg-amber-100 text-amber-700'
                        : i === 1
                          ? 'bg-slate-200 text-slate-600'
                          : i === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono font-bold text-slate-900">{r.name}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                  {r.waste.toFixed(4)} kWh
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${r.score >= 80 ? 'bg-emerald-500' : r.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold tabular-nums text-slate-800">
                      {r.score}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Wasted kWh per room
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} layout="vertical">
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 11 }} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }}
                labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                formatter={(v) => [`${Number(v).toFixed(4)} kWh`, 'Wasted']}
              />
              <Bar dataKey="waste" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {rows.map((r, i) => (
                  <Cell
                    key={r.id}
                    fill={i === 0 ? '#10b981' : i >= rows.length - 2 ? '#f43f5e' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
