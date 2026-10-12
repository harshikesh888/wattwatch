import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ROOMS } from '../data/rooms';

/**
 * Demo-only auth (no backend, per hackathon stack).
 * Users + session persist in localStorage. Passwords are obfuscated
 * with a non-cryptographic hash — NOT for production use.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  passHash: string;
  roomId: string;
  createdAt: number;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => string | null;
  signup: (name: string, email: string, password: string, roomId: string) => string | null;
  logout: () => void;
  roomNameOf: (u: User | null) => string;
}

const USERS_KEY = 'wattwatch-users';
const SESSION_KEY = 'wattwatch-session';

export function hashPw(pw: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < pw.length; i++) {
    const ch = pw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

function seedUsers(): User[] {
  return [
    {
      id: 'u-demo',
      name: 'Demo Student',
      email: 'demo@campus.edu',
      passHash: hashPw('demo123'),
      roomId: 'lh1',
      createdAt: Date.now(),
    },
  ];
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as User[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seedUsers();
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  }, [users]);

  useEffect(() => {
    try {
      if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  const value = useMemo<AuthContextValue>(() => {
    const user = users.find((u) => u.id === sessionId) ?? null;
    return {
      user,
      login: (email: string, password: string) => {
        const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!found || found.passHash !== hashPw(password)) return 'Invalid email or password.';
        setSessionId(found.id);
        return null;
      },
      signup: (name: string, email: string, password: string, roomId: string) => {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        if (cleanName.length < 2) return 'Please enter your name.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return 'Please enter a valid email.';
        if (password.length < 4) return 'Password must be at least 4 characters.';
        if (!ROOMS.some((r) => r.id === roomId)) return 'Please select your room.';
        if (users.some((u) => u.email.toLowerCase() === cleanEmail)) return 'Email already registered. Log in instead.';
        const nu: User = {
          id: `u-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          passHash: hashPw(password),
          roomId,
          createdAt: Date.now(),
        };
        setUsers((prev) => [...prev, nu]);
        setSessionId(nu.id);
        return null;
      },
      logout: () => setSessionId(null),
      roomNameOf: (u: User | null) => ROOMS.find((r) => r.id === u?.roomId)?.name ?? '—',
    };
  }, [users, sessionId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
