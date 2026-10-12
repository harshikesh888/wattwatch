export interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'hall';
  capacity: number;
  appliances: {
    lights_kW: number;
    fans_kW: number;
    ac_kW: number;
    projector_kW: number;
  };
}

export interface Reading {
  roomId: string;
  timestamp: number;
  power_kW: number;
  occupied: boolean;
  appliancesOn: string[];
}

export interface Alert {
  id: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  power_kW: number;
  status: 'active' | 'resolved';
  wasted_kWh: number;
}

export const APPLIANCE_KEYS = ['lights', 'fans', 'ac', 'projector'] as const;
export type ApplianceKey = (typeof APPLIANCE_KEYS)[number];

export const APPLIANCE_LABELS: Record<string, string> = {
  lights: 'Lights',
  fans: 'Fans',
  ac: 'AC',
  projector: 'Projector',
};

export const ROOMS: Room[] = [
  { id: 'lh1', name: 'LH-1', type: 'classroom', capacity: 120, appliances: { lights_kW: 0.35, fans_kW: 0.3, ac_kW: 1.8, projector_kW: 0.25 } },
  { id: 'lh2', name: 'LH-2', type: 'classroom', capacity: 120, appliances: { lights_kW: 0.35, fans_kW: 0.3, ac_kW: 2.0, projector_kW: 0.25 } },
  { id: 'cslab1', name: 'CS-Lab-1', type: 'lab', capacity: 60, appliances: { lights_kW: 0.3, fans_kW: 0.2, ac_kW: 1.5, projector_kW: 0.3 } },
  { id: 'cslab2', name: 'CS-Lab-2', type: 'lab', capacity: 60, appliances: { lights_kW: 0.3, fans_kW: 0.2, ac_kW: 1.5, projector_kW: 0.3 } },
  { id: 'libhall', name: 'Library-Hall', type: 'hall', capacity: 200, appliances: { lights_kW: 0.5, fans_kW: 0.4, ac_kW: 2.2, projector_kW: 0.15 } },
  { id: 'sem1', name: 'Seminar-1', type: 'hall', capacity: 80, appliances: { lights_kW: 0.3, fans_kW: 0.25, ac_kW: 1.6, projector_kW: 0.3 } },
  { id: 'sem2', name: 'Seminar-2', type: 'hall', capacity: 80, appliances: { lights_kW: 0.3, fans_kW: 0.25, ac_kW: 1.6, projector_kW: 0.3 } },
  { id: 'canteen', name: 'Canteen', type: 'hall', capacity: 150, appliances: { lights_kW: 0.4, fans_kW: 0.45, ac_kW: 1.2, projector_kW: 0.1 } },
];

export function roomById(id: string): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}
