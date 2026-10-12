export const RATE_RS_PER_KWH = 8.0;
export const CO2_KG_PER_KWH = 0.82;
export const KG_CO2_PER_TREE_YEAR = 21;

export function costRs(kwh: number): number {
  return kwh * RATE_RS_PER_KWH;
}

export function co2Kg(kwh: number): number {
  return kwh * CO2_KG_PER_KWH;
}

export function treesEquivalent(co2kg: number): number {
  return co2kg / KG_CO2_PER_TREE_YEAR;
}

export function phonesCharged(kwh: number): number {
  return kwh * 80;
}

export function efficiencyScore(wastedKwh: number): number {
  return Math.max(0, Math.round(100 - wastedKwh * 10));
}

export function fmtPower(kw: number): string {
  return `${kw.toFixed(2)} kW`;
}

export function fmtEnergy(kwh: number): string {
  return `${kwh.toFixed(3)} kWh`;
}

export function fmtRs(kwh: number): string {
  return `\u20B9${costRs(kwh).toFixed(2)}`;
}

export function fmtCO2(kwh: number): string {
  return `${co2Kg(kwh).toFixed(3)} kg`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour12: false });
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m ${rem}s`;
  return `${h}h ${m % 60}m`;
}
