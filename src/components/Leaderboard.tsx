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
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2 text-right">Wasted</th>
              <th className="px-4 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-black ${
                      i === 0
                        ? 'bg-amber-400/20 text-amber-300'
                        : i === 1
                          ? 'bg-slate-300/20 text-slate-200'
                          : i === 2
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono font-bold text-slate-100">{r.name}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-300">
                  {r.waste.toFixed(4)} kWh
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${r.score >= 80 ? 'bg-emerald-400' : r.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold tabular-nums text-slate-200">
                      {r.score}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          Wasted kWh per room
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} layout="vertical">
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(v) => [`${Number(v).toFixed(4)} kWh`, 'Wasted']}
              />
              <Bar dataKey="waste" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {rows.map((r, i) => (
                  <Cell
                    key={r.id}
                    fill={i === 0 ? '#34d399' : i >= rows.length - 2 ? '#f87171' : '#f59e0b'}
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
