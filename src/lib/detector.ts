/**
 * Waste detection engine.
 * Rule: IF occupied == false AND power_kW > 0.2 FOR 2 consecutive ticks
 * THEN create an Alert. While active, wasted_kWh grows every tick.
 */

export const WASTE_THRESHOLD_KW = 0.2;
export const CONSECUTIVE_TICKS_TO_ALERT = 2;

/** True when this single tick looks like waste. */
export function isWastingTick(occupied: boolean, power_kW: number): boolean {
  return !occupied && power_kW > WASTE_THRESHOLD_KW;
}

/** Energy consumed during one simulator tick. */
export function energyForTick(power_kW: number, tickMs: number): number {
  return power_kW * (tickMs / 3_600_000);
}
