import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ROOMS } from '../data/rooms';
import type { Alert, Reading, Room } from '../data/rooms';
import { co2Kg, costRs, phonesCharged, treesEquivalent } from './calculations';
import { CONSECUTIVE_TICKS_TO_ALERT, energyForTick, isWastingTick } from './detector';
import {
  AUTO_SHUFFLE_MS,
  SPONTANEOUS_WASTE_PROB,
  STANDBY_KW,
  randomAppliancesForOccupied,
  randomWasteAppliances,
  shouldAutoLeaveOn,
  simulatePower,
} from './simulator';

export interface RoomLiveState {
  occupied: boolean;
  appliancesOn: string[];
  power_kW: number;
  todayKWh: number;
}

interface EnergyState {
  live: Record<string, RoomLiveState>;
  readings: Record<string, Reading[]>;
  alerts: Alert[];
  streaks: Record<string, number>;
  lastShuffle: number;
  tick: number;
}

export type RoomStatus = 'wasting' | 'occupied' | 'efficient';

export interface Totals {
  liveKw: number;
  todayKwh: number;
  wastedKwh: number;
  wastedRs: number;
  co2Kg: number;
  trees: number;
  phones: number;
}

interface EnergyContextValue {
  rooms: Room[];
  live: Record<string, RoomLiveState>;
  readings: Record<string, Reading[]>;
  alerts: Alert[];
  activeAlerts: Alert[];
  historyAlerts: Alert[];
  tick: number;
  tickMs: number;
  now: number;
  totals: Totals;
  wasteByRoom: Record<string, number>;
  roomStatus: (roomId: string) => RoomStatus;
  roomName: (roomId: string) => string;
  toggleOccupied: (roomId: string) => void;
  toggleAppliance: (roomId: string, key: string) => void;
  resolveAlert: (alertId: string) => void;
  triggerDemoWaste: () => string | null;
  emptyAll: () => void;
  fillAll: () => void;
  setTickMs: (ms: number) => void;
  resetDay: () => void;
}

const STORAGE_KEY = 'wattwatch-v1';

/* Seed: 2 rooms start out wasting so alerts pop ~10s after load. */
const SEED_OCCUPIED: Record<string, boolean> = {
  lh1: true,
  lh2: false,
  cslab1: true,
  cslab2: false,
  libhall: true,
  sem1: false,
  sem2: false,
  canteen: true,
};

const SEED_APPLIANCES: Record<string, string[]> = {
  lh1: ['lights', 'fans', 'ac'],
  lh2: ['lights', 'ac'],
  cslab1: ['lights', 'fans', 'projector'],
  cslab2: [],
  libhall: ['lights', 'fans', 'ac'],
  sem1: ['lights', 'fans'],
  sem2: [],
  canteen: ['lights', 'fans'],
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Persisted {
  live: Record<string, RoomLiveState>;
  alerts: Alert[];
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed || typeof parsed.live !== 'object' || !Array.isArray(parsed.alerts)) return null;
    for (const r of ROOMS) {
      const s = parsed.live[r.id];
      if (!s || typeof s.occupied !== 'boolean' || !Array.isArray(s.appliancesOn)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildInitialState(): EnergyState {
  const now = Date.now();
  const loaded = loadPersisted();
  const live: Record<string, RoomLiveState> = {};
  for (const room of ROOMS) {
    const saved = loaded?.live[room.id];
    const occupied = saved ? saved.occupied : (SEED_OCCUPIED[room.id] ?? true);
    const appliancesOn = saved ? [...saved.appliancesOn] : [...(SEED_APPLIANCES[room.id] ?? ['lights'])];
    const power_kW = simulatePower(room, occupied, appliancesOn);
    const todayKWh =
      saved && typeof saved.todayKWh === 'number' ? saved.todayKWh : round2(rand(1.2, 4.8));
    live[room.id] = { occupied, appliancesOn, power_kW, todayKWh };
  }
  const readings: Record<string, Reading[]> = {};
  for (const room of ROOMS) {
    const pts: Reading[] = [];
    for (let i = 20; i >= 1; i--) {
      const s = live[room.id];
      pts.push({
        roomId: room.id,
        timestamp: now - i * 5000,
        power_kW: simulatePower(room, s.occupied, s.appliancesOn),
        occupied: s.occupied,
        appliancesOn: [...s.appliancesOn],
      });
    }
    readings[room.id] = pts;
  }
  return { live, readings, alerts: loaded?.alerts ?? [], streaks: {}, lastShuffle: now, tick: 0 };
}

function doTick(prev: EnergyState, tickMs: number, now: number): EnergyState {
  const live: Record<string, RoomLiveState> = {};
  const readings: Record<string, Reading[]> = {};
  const streaks: Record<string, number> = { ...prev.streaks };
  const nextAlerts: Alert[] = prev.alerts.map((a) => ({ ...a }));
  const activeByRoom = new Map<string, number>();
  nextAlerts.forEach((a, i) => {
    if (a.status === 'active') activeByRoom.set(a.roomId, i);
  });

  for (const room of ROOMS) {
    const cur = prev.live[room.id];
    const occupied = cur.occupied;
    let appliancesOn = cur.appliancesOn;
    if (!occupied && appliancesOn.length === 0 && Math.random() < SPONTANEOUS_WASTE_PROB) {
      appliancesOn = randomWasteAppliances();
    }
    const power = simulatePower(room, occupied, appliancesOn);
    live[room.id] = {
      occupied,
      appliancesOn,
      power_kW: power,
      todayKWh: cur.todayKWh + energyForTick(power, tickMs),
    };
    const reading: Reading = {
      roomId: room.id,
      timestamp: now,
      power_kW: power,
      occupied,
      appliancesOn: [...appliancesOn],
    };
    readings[room.id] = [...(prev.readings[room.id] ?? []), reading].slice(-50);

    const wasting = isWastingTick(occupied, power);
    streaks[room.id] = wasting ? (streaks[room.id] ?? 0) + 1 : 0;

    const ai = activeByRoom.get(room.id);
    if (ai !== undefined) {
      const a = nextAlerts[ai];
      a.power_kW = power;
      a.wasted_kWh += energyForTick(power, tickMs);
      if (!wasting) {
        a.status = 'resolved';
        a.endTime = now;
        activeByRoom.delete(room.id);
      }
    } else if (wasting && (streaks[room.id] ?? 0) >= CONSECUTIVE_TICKS_TO_ALERT) {
      nextAlerts.push({
        id: `a-${now}-${room.id}`,
        roomId: room.id,
        startTime: now - tickMs,
        power_kW: power,
        status: 'active',
        wasted_kWh: energyForTick(power, tickMs),
      });
    }
  }

  let lastShuffle = prev.lastShuffle;
  if (now - prev.lastShuffle >= AUTO_SHUFFLE_MS) {
    lastShuffle = now;
    const ids = ROOMS.map((r) => r.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    for (const id of ids) {
      const s = live[id];
      s.occupied = !s.occupied;
      if (s.occupied) {
        s.appliancesOn = randomAppliancesForOccupied();
      } else {
        s.appliancesOn =
          shouldAutoLeaveOn() && s.appliancesOn.length > 0 ? s.appliancesOn : Math.random() < 0.35 ? randomWasteAppliances() : [];
        if (shouldAutoLeaveOn() && s.appliancesOn.length === 0) s.appliancesOn = randomWasteAppliances();
      }
      streaks[id] = 0;
    }
  }

  return { live, readings, alerts: nextAlerts, streaks, lastShuffle, tick: prev.tick + 1 };
}

const EnergyContext = createContext<EnergyContextValue | null>(null);

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EnergyState>(buildInitialState);
  const [tickMs, setTickMsState] = useState(5000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => {
      const at = Date.now();
      setState((prev) => doTick(prev, tickMs, at));
    }, tickMs);
    return () => window.clearInterval(t);
  }, [tickMs]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ live: state.live, alerts: state.alerts }));
    } catch {
      /* storage full / unavailable */
    }
  }, [state.live, state.alerts]);

  const value = useMemo<EnergyContextValue>(() => {
    const activeAlerts = state.alerts
      .filter((a) => a.status === 'active')
      .sort((a, b) => b.startTime - a.startTime);
    const historyAlerts = state.alerts
      .filter((a) => a.status === 'resolved')
      .sort((a, b) => (b.endTime ?? b.startTime) - (a.endTime ?? a.startTime));

    const liveKw = ROOMS.reduce((s, r) => s + (state.live[r.id]?.power_kW ?? 0), 0);
    const todayKwh = ROOMS.reduce((s, r) => s + (state.live[r.id]?.todayKWh ?? 0), 0);
    const wastedKwh = state.alerts.reduce((s, a) => s + a.wasted_kWh, 0);

    const totals: Totals = {
      liveKw,
      todayKwh,
      wastedKwh,
      wastedRs: costRs(wastedKwh),
      co2Kg: co2Kg(wastedKwh),
      trees: treesEquivalent(co2Kg(wastedKwh)),
      phones: phonesCharged(wastedKwh),
    };

    const wasteByRoom: Record<string, number> = {};
    for (const r of ROOMS) wasteByRoom[r.id] = 0;
    for (const a of state.alerts) wasteByRoom[a.roomId] = (wasteByRoom[a.roomId] ?? 0) + a.wasted_kWh;

    const roomName = (roomId: string) => ROOMS.find((r) => r.id === roomId)?.name ?? roomId;

    const roomStatus = (roomId: string): RoomStatus => {
      if (activeAlerts.some((a) => a.roomId === roomId)) return 'wasting';
      return state.live[roomId]?.occupied ? 'occupied' : 'efficient';
    };

    return {
      rooms: ROOMS,
      live: state.live,
      readings: state.readings,
      alerts: state.alerts,
      activeAlerts,
      historyAlerts,
      tick: state.tick,
      tickMs,
      now,
      totals,
      wasteByRoom,
      roomStatus,
      roomName,
      toggleOccupied: (roomId: string) => {
        setState((prev) => {
          const cur = prev.live[roomId];
          if (!cur) return prev;
          const occupied = !cur.occupied;
          const appliancesOn =
            occupied && cur.appliancesOn.length === 0 ? ['lights', 'fans'] : cur.appliancesOn;
          return {
            ...prev,
            live: { ...prev.live, [roomId]: { ...cur, occupied, appliancesOn } },
            streaks: { ...prev.streaks, [roomId]: 0 },
          };
        });
      },
      toggleAppliance: (roomId: string, key: string) => {
        setState((prev) => {
          const cur = prev.live[roomId];
          if (!cur) return prev;
          const has = cur.appliancesOn.includes(key);
          const appliancesOn = has
            ? cur.appliancesOn.filter((k) => k !== key)
            : [...cur.appliancesOn, key];
          return {
            ...prev,
            live: { ...prev.live, [roomId]: { ...cur, appliancesOn } },
          };
        });
      },
      resolveAlert: (alertId: string) => {
        setState((prev) => {
          const alert = prev.alerts.find((a) => a.id === alertId);
          if (!alert || alert.status !== 'active') return prev;
          const roomId = alert.roomId;
          const cur = prev.live[roomId];
          if (!cur) return prev;
          const at = Date.now();
          return {
            ...prev,
            live: {
              ...prev.live,
              [roomId]: { ...cur, appliancesOn: [], power_kW: STANDBY_KW },
            },
            alerts: prev.alerts.map((a) =>
              a.id === alertId ? { ...a, status: 'resolved' as const, endTime: at } : a,
            ),
            streaks: { ...prev.streaks, [roomId]: 0 },
          };
        });
      },
      triggerDemoWaste: () => {
        const snap = state.live;
        const candidates = ROOMS.filter(
          (r) => snap[r.id]?.occupied && snap[r.id].appliancesOn.length > 0,
        ).sort((a, b) => snap[b.id].power_kW - snap[a.id].power_kW);
        const target = candidates[0] ?? ROOMS.find((r) => snap[r.id]?.occupied) ?? ROOMS[0];
        setState((prev) => {
          const cur = prev.live[target.id];
          const appliancesOn = cur.appliancesOn.length > 0 ? cur.appliancesOn : ['lights', 'ac'];
          return {
            ...prev,
            live: { ...prev.live, [target.id]: { ...cur, occupied: false, appliancesOn } },
            streaks: { ...prev.streaks, [target.id]: 0 },
          };
        });
        return target.id;
      },
      emptyAll: () => {
        setState((prev) => {
          const live = { ...prev.live };
          for (const r of ROOMS) live[r.id] = { ...live[r.id], occupied: false };
          return { ...prev, live };
        });
      },
      fillAll: () => {
        setState((prev) => {
          const live = { ...prev.live };
          for (const r of ROOMS) {
            const cur = live[r.id];
            live[r.id] = {
              ...cur,
              occupied: true,
              appliancesOn: cur.appliancesOn.length > 0 ? cur.appliancesOn : ['lights', 'fans'],
            };
          }
          return { ...prev, live, streaks: {} };
        });
      },
      setTickMs: (ms: number) => setTickMsState(ms === 1000 ? 1000 : 5000),
      resetDay: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setState(buildInitialState());
      },
    };
  }, [state, tickMs, now]);

  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>;
}

export function useEnergy(): EnergyContextValue {
  const ctx = useContext(EnergyContext);
  if (!ctx) throw new Error('useEnergy must be used inside EnergyProvider');
  return ctx;
}
