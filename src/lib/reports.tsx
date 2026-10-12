import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Room problem reports raised by logged-in users. Persisted in localStorage. */

export type ReportStatus = 'open' | 'in-progress' | 'resolved';

export interface Report {
  id: string;
  roomId: string;
  category: string;
  description: string;
  status: ReportStatus;
  reporterId: string;
  reporterName: string;
  createdAt: number;
  updatedAt: number;
}

export interface NewReport {
  roomId: string;
  category: string;
  description: string;
  reporterId: string;
  reporterName: string;
}

interface ReportsContextValue {
  reports: Report[];
  openCount: number;
  addReport: (input: NewReport) => Report;
  setStatus: (id: string, status: ReportStatus) => void;
}

export const REPORT_CATEGORIES = [
  'AC not cooling / left running',
  'Lights flickering / fused',
  'Fan not working / noisy',
  'Projector issue',
  'Power wastage in empty room',
  'Socket / switch fault',
  'Other',
];

const REPORTS_KEY = 'wattwatch-reports';

function seedReports(): Report[] {
  const now = Date.now();
  return [
    {
      id: 'r-seed-1',
      roomId: 'sem1',
      category: 'Projector issue',
      description: 'Projector in Seminar-1 shuts off after 10 minutes. Checked the remote batteries already.',
      status: 'open',
      reporterId: 'u-demo',
      reporterName: 'Demo Student',
      createdAt: now - 3 * 3600_000,
      updatedAt: now - 3 * 3600_000,
    },
    {
      id: 'r-seed-2',
      roomId: 'lh2',
      category: 'AC not cooling / left running',
      description: 'LH-2 AC keeps running even when the room is empty. Raising so facility can check the timer.',
      status: 'in-progress',
      reporterId: 'u-demo',
      reporterName: 'Demo Student',
      createdAt: now - 26 * 3600_000,
      updatedAt: now - 5 * 3600_000,
    },
  ];
}

function loadReports(): Report[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Report[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seedReports();
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(loadReports);

  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    } catch {
      /* ignore */
    }
  }, [reports]);

  const value = useMemo<ReportsContextValue>(() => {
    const sorted = [...reports].sort((a, b) => b.createdAt - a.createdAt);
    return {
      reports: sorted,
      openCount: reports.filter((r) => r.status !== 'resolved').length,
      addReport: (input: NewReport) => {
        const r: Report = {
          id: `r-${Date.now()}`,
          roomId: input.roomId,
          category: input.category,
          description: input.description.trim(),
          status: 'open',
          reporterId: input.reporterId,
          reporterName: input.reporterName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setReports((prev) => [r, ...prev]);
        return r;
      },
      setStatus: (id: string, status: ReportStatus) => {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status, updatedAt: Date.now() } : r)),
        );
      },
    };
  }, [reports]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used inside ReportsProvider');
  return ctx;
}
