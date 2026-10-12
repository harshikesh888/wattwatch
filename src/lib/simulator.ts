import type { Room } from '../data/rooms';

/**
 * Live power simulator. Ticks every 5 seconds (see store).
 * - occupied=true:  power = rated sum of appliances ON x random 60-100%.
 * - occupied=false + appliances left ON: waste power 0.25-2.8 kW.
 * - occupied=false + everything off: 0.02 kW standby.
 */

export const TICK_MS = 5000;
export const STANDBY_KW = 0.02;
export const AUTO_SHUFFLE_MS = 120_000;
export const SPONTANEOUS_WASTE_PROB = 0.03;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applianceRating(room: Room, key: string): number {
  switch (key) {
    case 'lights':
      return room.appliances.lights_kW;
    case 'fans':
      return room.appliances.fans_kW;
    case 'ac':
      return room.appliances.ac_kW;
    case 'projector':
      return room.appliances.projector_kW;
    default:
      return 0;
  }
}

export function simulatePower(room: Room, occupied: boolean, appliancesOn: string[]): number {
  if (occupied) {
    if (appliancesOn.length === 0) return round3(rand(0.03, 0.07));
    let sum = 0;
    for (const k of appliancesOn) sum += applianceRating(room, k) * rand(0.6, 1.0);
    return round3(clamp(sum * rand(0.95, 1.05), 0.3, 3.5));
  }
  if (appliancesOn.length === 0) return STANDBY_KW;
  let sum = 0;
  for (const k of appliancesOn) sum += applianceRating(room, k) * rand(0.7, 1.0);
  return round3(clamp(sum, 0.25, 2.8));
}

/** Realistic appliance mix when a room becomes occupied. */
export function randomAppliancesForOccupied(): string[] {
  const on: string[] = [];
  if (Math.random() < 0.9) on.push('lights');
  if (Math.random() < 0.8) on.push('fans');
  if (Math.random() < 0.6) on.push('ac');
  if (Math.random() < 0.25) on.push('projector');
  return on;
}

/** Appliances "left on" when a room is found empty. */
export function randomWasteAppliances(): string[] {
  const on: string[] = [];
  if (Math.random() < 0.7) on.push('lights');
  if (Math.random() < 0.5) on.push('fans');
  if (Math.random() < 0.3) on.push('ac');
  if (on.length === 0) on.push('lights');
  return on;
}

/** ~35% chance appliances are left ON when a room auto-empties (demo liveliness). */
export function shouldAutoLeaveOn(): boolean {
  return Math.random() < 0.35;
}
