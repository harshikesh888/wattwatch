'use strict';

const RATE_PER_KWH = 8;
const CO2_PER_KWH = 0.82;
const STANDBY_KW = 0.02;
let WASTE_THRESHOLD_KW = 0.2;
const WATER_THRESHOLD_LPM = 0.5;
const TAP_FLOW_LPM = 6;
const LEAK_FLOW_LPM = 2.5;
const PLASTIC_CO2_PER_PC = 0.082;
const ROOM_COLORS = ['#00e5ff', '#2e9bff', '#7c5cff', '#00e5a0', '#ff4d6d', '#ffbe0b', '#7df3ff', '#38f8ff'];
const APPLIANCES = [
  { key: 'lights', label: 'Lights', rating: 'lights_kW' },
  { key: 'fans', label: 'Fans', rating: 'fans_kW' },
  { key: 'ac', label: 'AC', rating: 'ac_kW' },
  { key: 'projector', label: 'Projector', rating: 'projector_kW' },
];
const REPORT_CATEGORIES = [
  'AC not cooling / left running',
  'Lights flickering / fused',
  'Fan not working / noisy',
  'Projector issue',
  'Power wastage in empty room',
  'Tap leaking / left open',
  'Water tank overflow',
  'Plastic / waste pile',
  'Overflowing dustbin — needs segregation',
  'Socket / switch fault',
  'Other',
];
const ROOMS = [
  { id: 'lh1', name: 'LH-1', type: 'classroom', capacity: 120, appliances: { lights_kW: 0.35, fans_kW: 0.3, ac_kW: 1.8, projector_kW: 0.25 } },
  { id: 'lh2', name: 'LH-2', type: 'classroom', capacity: 120, appliances: { lights_kW: 0.35, fans_kW: 0.3, ac_kW: 2.0, projector_kW: 0.25 } },
  { id: 'cslab1', name: 'CS-Lab-1', type: 'lab', capacity: 60, appliances: { lights_kW: 0.3, fans_kW: 0.2, ac_kW: 1.5, projector_kW: 0.3 } },
  { id: 'cslab2', name: 'CS-Lab-2', type: 'lab', capacity: 60, appliances: { lights_kW: 0.3, fans_kW: 0.2, ac_kW: 1.5, projector_kW: 0.3 } },
  { id: 'libhall', name: 'Library-Hall', type: 'hall', capacity: 200, appliances: { lights_kW: 0.5, fans_kW: 0.4, ac_kW: 2.2, projector_kW: 0.15 } },
  { id: 'sem1', name: 'Seminar-1', type: 'hall', capacity: 80, appliances: { lights_kW: 0.3, fans_kW: 0.25, ac_kW: 1.6, projector_kW: 0.3 } },
  { id: 'sem2', name: 'Seminar-2', type: 'hall', capacity: 80, appliances: { lights_kW: 0.3, fans_kW: 0.25, ac_kW: 1.6, projector_kW: 0.3 } },
  { id: 'canteen', name: 'Canteen', type: 'hall', capacity: 150, appliances: { lights_kW: 0.4, fans_kW: 0.45, ac_kW: 1.2, projector_kW: 0.1 } },
];

const SEED_OCCUPIED = {
  lh1: true, lh2: false, cslab1: true, cslab2: false,
  libhall: true, sem1: false, sem2: false, canteen: true,
};
const SEED_APPLIANCES = {
  lh1: ['lights', 'fans', 'ac'],
  lh2: ['lights', 'ac'],
  cslab1: ['lights', 'fans', 'projector'],
  cslab2: [],
  libhall: ['lights', 'fans', 'ac'],
  sem1: ['lights', 'fans'],
  sem2: [],
  canteen: ['lights', 'fans'],
};
const SEED_WATER = {
  lh1: { taps_on: false, leak: false },
  lh2: { taps_on: true, leak: false },
  cslab1: { taps_on: false, leak: false },
  cslab2: { taps_on: false, leak: false },
  libhall: { taps_on: false, leak: false },
  sem1: { taps_on: true, leak: false },
  sem2: { taps_on: false, leak: false },
  canteen: { taps_on: true, leak: false },
};

const PAGE_INFO = {
  dashboard: ['Energy + Water + Materials Overview', 'Detecting empty rooms wasting power or water, plus plastic reuse.'],
  alerts: ['Urgent Problems', 'Active energy, water and material waste ranked by what needs attention first.'],
  water: ['Water & Reuse', 'Leaks and taps left open — fix the leak or reuse greywater for gardening.'],
  materials: ['Materials — Reuse & Recycle', 'Plastic, paper and e-waste diverted from landfill into recycle and reuse.'],
  rooms: ['Campus Rooms', 'Toggle occupancy, appliances, taps and leaks to simulate live campus conditions.'],
  impact: ['Savings & Impact', 'Money, water, diversion rate and the room efficiency leaderboard.'],
  reports: ['Room Problem Reports', 'Raise an equipment fault, leak or waste dump and track it until fixed.'],
};

let sim = loadSimulation();
let problems = [];
let materialLogs = [];
let materialStats = null;
let weather = null;
let currentView = 'dashboard';
let reportFilter = 'all';
let alertFilter = 'all';
let tickTimer = null;
let tickInProgress = false;
let toastTimer = null;
let backendOnline = false;
let authToken = localStorage.getItem('wattwatch-token') || '';
let authUser = safeParse(localStorage.getItem('wattwatch-user'));
let authTab = 'login';
const energyCreateRetryAfter = {};
const waterCreateRetryAfter = {};

function isAuthed() {
  return Boolean(authToken && authUser);
}

function authHeaders(extra = {}) {
  if (authToken) return { ...extra, Authorization: `Bearer ${authToken}` };
  return { ...extra };
}

function setAuthError(message) {
  const box = document.getElementById('auth-error');
  if (!box) return;
  if (!message) {
    box.hidden = true;
    box.textContent = '';
  } else {
    box.hidden = false;
    box.textContent = message;
  }
}

function setAuthLoading(loading) {
  for (const id of ['login-submit', 'register-submit']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = loading;
  }
}

function updateAuthTab() {
  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.authTab === authTab);
  });
  document.getElementById('login-form').hidden = authTab !== 'login';
  document.getElementById('register-form').hidden = authTab !== 'register';
  setAuthError('');
}

function updateUserChips() {
  const name = authUser?.name || 'User';
  const email = authUser?.email || '';
  const initial = (name.trim()[0] || 'W').toUpperCase();
  for (const [chipId, avatarId, nameId] of [['user-chip', 'user-avatar', 'user-name']]) {
    const chip = document.getElementById(chipId);
    if (chip) chip.hidden = !isAuthed();
    const avatar = document.getElementById(avatarId);
    if (avatar) avatar.textContent = initial;
    const label = document.getElementById(nameId);
    if (label) label.textContent = name;
  }
  const side = document.getElementById('sidebar-user');
  if (side) side.hidden = !isAuthed();
  const sideAvatar = document.getElementById('sidebar-avatar');
  if (sideAvatar) sideAvatar.textContent = initial;
  const sideName = document.getElementById('sidebar-user-name');
  if (sideName) sideName.textContent = name;
  const sideEmail = document.getElementById('sidebar-user-email');
  if (sideEmail) sideEmail.textContent = email;
  const reporter = document.getElementById('reporter-name');
  if (reporter && authUser?.name && !localStorage.getItem('wattwatch-reporter-name')) {
    reporter.value = authUser.name;
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').hidden = false;
  document.getElementById('app-shell').hidden = true;
  if (tickTimer) window.clearInterval(tickTimer);
  tickTimer = null;
}

function showApp() {
  document.getElementById('auth-screen').hidden = true;
  document.getElementById('app-shell').hidden = false;
  updateUserChips();
  renderInitial();
  refreshProblems().finally(() => {
    restartTickTimer();
    drawPowerChart();
  });
  refreshMaterials({ quiet: true });
  refreshWeather();
}

function saveAuth(token, user) {
  authToken = token;
  authUser = user;
  try {
    localStorage.setItem('wattwatch-token', token);
    localStorage.setItem('wattwatch-user', JSON.stringify(user));
  } catch { /* storage optional */ }
}

function clearAuth() {
  authToken = '';
  authUser = null;
  try {
    localStorage.removeItem('wattwatch-token');
    localStorage.removeItem('wattwatch-user');
  } catch { /* ignore */ }
}

async function handleLogout() {
  try {
    if (authToken) {
      await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => null);
    }
  } finally {
    clearAuth();
    problems = [];
    updateUserChips();
    showAuthScreen();
    showToast('Logged out. See you on the neon grid.');
  }
}

async function handleAuthResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).join(', ')
      : body.detail;
    throw new Error(detail || `Authentication failed (${response.status})`);
  }
  if (!body.token || !body.user) throw new Error('Invalid auth response from server.');
  return body;
}

async function submitLogin(event) {
  event.preventDefault();
  setAuthError('');
  setAuthLoading(true);
  try {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const body = await handleAuthResponse(await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }));
    saveAuth(body.token, body.user);
    showApp();
    showToast(`Welcome back, ${body.user.name.split(' ')[0]} ⚡`);
  } catch (error) {
    setAuthError(error.message);
  } finally {
    setAuthLoading(false);
  }
}

async function submitRegister(event) {
  event.preventDefault();
  setAuthError('');
  setAuthLoading(true);
  try {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const body = await handleAuthResponse(await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }));
    saveAuth(body.token, body.user);
    showApp();
    showToast(`Account created — welcome, ${body.user.name.split(' ')[0]} ✦`);
  } catch (error) {
    setAuthError(error.message);
  } finally {
    setAuthLoading(false);
  }
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function buildInitialSimulation(saved = null, legacy = null) {
  const legacyLive = legacy && legacy.live && typeof legacy.live === 'object' ? legacy.live : {};
  const oldAlerts = legacy && Array.isArray(legacy.alerts) ? legacy.alerts : [];
  const rooms = {};
  const readings = {};
  const wasteByRoom = {};
  const waterWasteByRoom = {};
  for (const room of ROOMS) {
    const previous = (saved && saved.rooms && saved.rooms[room.id])
      || (saved && saved.live && saved.live[room.id])
      || legacyLive[room.id];
    const occupied = typeof previous?.occupied === 'boolean' ? previous.occupied : (SEED_OCCUPIED[room.id] ?? true);
    const appliancesOn = Array.isArray(previous?.appliancesOn)
      ? [...previous.appliancesOn]
      : [...(SEED_APPLIANCES[room.id] || ['lights'])];
    const seedW = SEED_WATER[room.id] || { taps_on: false, leak: false };
    const taps_on = typeof previous?.taps_on === 'boolean' ? previous.taps_on : seedW.taps_on;
    const leak = typeof previous?.leak === 'boolean' ? previous.leak : seedW.leak;
    const flowSeed = simulateFlow(room, occupied, taps_on, leak);
    rooms[room.id] = {
      occupied,
      appliancesOn,
      taps_on,
      leak,
      flow_lpm: typeof previous?.flow_lpm === 'number' ? previous.flow_lpm : flowSeed,
      today_litres: typeof previous?.today_litres === 'number' ? previous.today_litres : Number((40 + Math.random() * 160).toFixed(1)),
      power_kw: typeof previous?.power_kw === 'number' ? previous.power_kw : simulatePower(room, occupied, appliancesOn),
      today_kwh: typeof previous?.today_kwh === 'number'
        ? previous.today_kwh
        : typeof previous?.todayKWh === 'number'
          ? previous.todayKWh
          : Number((1.2 + Math.random() * 3.6).toFixed(2)),
    };
    const oldRoomWaste = oldAlerts
      .filter((alert) => alert.roomId === room.id)
      .reduce((sum, alert) => sum + (Number(alert.wasted_kWh) || 0), 0);
    wasteByRoom[room.id] = saved?.wasteByRoom?.[room.id] ?? oldRoomWaste;
    waterWasteByRoom[room.id] = saved?.waterWasteByRoom?.[room.id] ?? 0;
    readings[room.id] = Array.isArray(saved?.readings?.[room.id])
      ? saved.readings[room.id].slice(-50)
      : [];
  }
  const oldWaste = oldAlerts.reduce((sum, alert) => sum + (Number(alert.wasted_kWh) || 0), 0);
  return {
    rooms,
    readings,
    streaks: saved?.streaks || {},
    waterStreaks: saved?.waterStreaks || {},
    wasteByRoom,
    waterWasteByRoom,
    total_wasted_kwh: Number.isFinite(saved?.total_wasted_kwh) ? saved.total_wasted_kwh : oldWaste,
    total_wasted_litres: Number.isFinite(saved?.total_wasted_litres) ? saved.total_wasted_litres : 0,
    total_reused_litres: Number.isFinite(saved?.total_reused_litres) ? saved.total_reused_litres : 0,
    total_water_litres: Number.isFinite(saved?.total_water_litres)
      ? saved.total_water_litres
      : Object.values(rooms).reduce((s, r) => s + (r.today_litres || 0), 0),
    tick: Number(saved?.tick) || 0,
    tick_ms: saved?.tick_ms === 1000 ? 1000 : 5000,
    last_shuffle: Number(saved?.last_shuffle) || Date.now(),
  };
}

function loadSimulation() {
  const saved = safeParse(localStorage.getItem('wattwatch-simulator-v2'));
  const legacy = saved ? null : safeParse(localStorage.getItem('wattwatch-v1'));
  return buildInitialSimulation(saved, legacy);
}

function saveSimulation() {
  try {
    localStorage.setItem('wattwatch-simulator-v2', JSON.stringify(sim));
  } catch {
    /* The live simulator still works if browser storage is unavailable. */
  }
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function applianceRating(room, key) {
  const appliance = APPLIANCES.find((item) => item.key === key);
  return appliance ? room.appliances[appliance.rating] : 0;
}

function simulatePower(room, occupied, appliancesOn) {
  if (occupied) {
    if (appliancesOn.length === 0) return Number(rand(0.03, 0.07).toFixed(3));
    const sum = appliancesOn.reduce((total, key) => total + applianceRating(room, key) * rand(0.6, 1), 0);
    return Number(Math.min(3.5, Math.max(0.3, sum * rand(0.95, 1.05))).toFixed(3));
  }
  if (appliancesOn.length === 0) return STANDBY_KW;
  const sum = appliancesOn.reduce((total, key) => total + applianceRating(room, key) * rand(0.7, 1), 0);
  return Number(Math.min(2.8, Math.max(0.25, sum)).toFixed(3));
}

function simulateFlow(room, occupied, taps_on, leak) {
  let flow = 0;
  if (taps_on) flow += TAP_FLOW_LPM * rand(0.7, 1);
  if (leak) flow += LEAK_FLOW_LPM * rand(0.8, 1.2);
  if (occupied && taps_on && Math.random() < 0.3) flow *= rand(0.4, 0.8);
  if (!taps_on && !leak) return 0;
  return Number(Math.min(20, Math.max(0.4, flow)).toFixed(2));
}

function randomWasteAppliances() {
  const picked = [];
  if (Math.random() < 0.7) picked.push('lights');
  if (Math.random() < 0.5) picked.push('fans');
  if (Math.random() < 0.3) picked.push('ac');
  if (picked.length === 0) picked.push('lights');
  return picked;
}

function randomOccupiedAppliances() {
  const picked = [];
  if (Math.random() < 0.9) picked.push('lights');
  if (Math.random() < 0.8) picked.push('fans');
  if (Math.random() < 0.6) picked.push('ac');
  if (Math.random() < 0.25) picked.push('projector');
  return picked;
}

async function apiRequest(path, options = {}) {
  const headers = authHeaders({ ...(options.headers || {}) });
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 && isAuthed() && path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    clearAuth();
    updateUserChips();
    showAuthScreen();
    setAuthError('Session expired. Please log in again.');
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).join(', ')
      : body.detail;
    const error = new Error(detail || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function setBackendStatus(online) {
  backendOnline = online;
  const pill = document.getElementById('backend-status');
  if (!pill) return;
  pill.className = `backend-pill ${online ? 'connected' : 'offline'}`;
  pill.innerHTML = `<span></span>${online ? 'API connected' : 'API offline'}`;
  pill.title = online ? 'Problems are stored in SQLite.' : 'Could not reach the FastAPI backend.';
}

async function refreshProblems({ quiet = false } = {}) {
  if (!isAuthed()) return false;
  try {
    const result = await apiRequest('/api/problems');
    problems = Array.isArray(result.items) ? result.items : [];
    setBackendStatus(true);
    renderProblems();
    renderLive();
    refreshMaterials({ quiet: true }).catch(() => {});
    return true;
  } catch (error) {
    if (error && error.status === 401) return false;
    setBackendStatus(false);
    if (!quiet) showToast(`Backend unavailable: ${error.message}`, 'error');
    return false;
  }
}

async function refreshMaterials({ quiet = false } = {}) {
  if (!isAuthed()) return false;
  try {
    const [logs, stats] = await Promise.all([
      apiRequest('/api/materials?limit=50'),
      apiRequest('/api/materials/stats'),
    ]);
    materialLogs = Array.isArray(logs.items) ? logs.items : [];
    materialStats = stats;
    renderMaterials();
    renderLive();
    return true;
  } catch (error) {
    if (!quiet) showToast(`Materials unavailable: ${error.message}`, 'error');
    return false;
  }
}

async function refreshWeather() {
  if (!isAuthed()) return;
  try {
    const data = await apiRequest('/api/weather');
    weather = data;
    if (typeof data.temperature_c === 'number') {
      WASTE_THRESHOLD_KW = data.temperature_c >= 32 ? 0.3 : data.temperature_c >= 27 ? 0.25 : 0.2;
    }
    renderWeather();
    renderLive();
  } catch {
    /* weather is best-effort; demo works offline */
  }
}

function byKind(kind) {
  return problems.filter((problem) => problem.kind === kind);
}

function activeEnergyProblems() {
  return byKind('energy_waste');
}

function activeWaterProblems() {
  return byKind('water_waste');
}

function materialWasteProblems() {
  return byKind('material_waste');
}

function maintenanceProblems() {
  return byKind('maintenance');
}

function activeProblemCount() {
  return activeEnergyProblems().length + activeWaterProblems().length + materialWasteProblems().length;
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m ${seconds % 60}s`;
  return `${hours}h ${minutes % 60}m`;
}

function formatClock(date = new Date()) {
  return date.toLocaleTimeString('en-IN', { hour12: false });
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'just now' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show${type === 'error' ? ' error' : ''}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function currentPowerTotal() {
  return ROOMS.reduce((sum, room) => sum + (sim.rooms[room.id]?.power_kw || 0), 0);
}

function currentFlowTotal() {
  return ROOMS.reduce((sum, room) => sum + (sim.rooms[room.id]?.flow_lpm || 0), 0);
}

function totalEnergyToday() {
  return ROOMS.reduce((sum, room) => sum + (sim.rooms[room.id]?.today_kwh || 0), 0);
}

function totalWaterToday() {
  return ROOMS.reduce((sum, room) => sum + (sim.rooms[room.id]?.today_litres || 0), 0);
}

function co2For(kwh) {
  return kwh * CO2_PER_KWH;
}

function updateHeader() {
  const [title, subtitle] = PAGE_INFO[currentView] || PAGE_INFO.dashboard;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  const activeCount = activeProblemCount();
  const energyCount = activeEnergyProblems().length;
  const waterCount = activeWaterProblems().length;
  const status = document.getElementById('header-status');
  status.textContent = activeCount ? `${activeCount} wasting (${energyCount}⚡ ${waterCount}💧)` : 'All clean';
  status.className = `status-pill ${activeCount ? 'wasting' : 'clean'}`;
  document.getElementById('top-live-load').textContent = `${currentPowerTotal().toFixed(2)} kW`;
  const waterEl = document.getElementById('top-live-water');
  if (waterEl) waterEl.textContent = `${currentFlowTotal().toFixed(1)} L/min`;
  document.getElementById('clock').textContent = formatClock();
  const alertBadge = document.getElementById('nav-alert-count');
  if (alertBadge) alertBadge.textContent = activeCount ? String(activeCount) : '';
  const waterBadge = document.getElementById('nav-water-count');
  if (waterBadge) waterBadge.textContent = waterCount ? String(waterCount) : '';
  const reportCount = maintenanceProblems().length + materialWasteProblems().length;
  const reportBadge = document.getElementById('nav-report-count');
  if (reportBadge) reportBadge.textContent = reportCount ? String(reportCount) : '';
}

function updateKpis() {
  const live = currentPowerTotal();
  const used = totalEnergyToday();
  const wasted = sim.total_wasted_kwh;
  const co2 = co2For(wasted);
  document.getElementById('kpi-live').textContent = `${live.toFixed(2)} kW`;
  document.getElementById('kpi-tick').textContent = `Reading #${sim.tick} · refreshes every ${sim.tick_ms / 1000}s · threshold ${WASTE_THRESHOLD_KW.toFixed(2)} kW`;
  document.getElementById('kpi-used').textContent = `${used.toFixed(2)} kWh`;
  document.getElementById('kpi-wasted').textContent = `₹${(wasted * RATE_PER_KWH).toFixed(2)}`;
  document.getElementById('kpi-wasted-note').textContent = `${wasted.toFixed(3)} kWh wasted at ₹8/unit`;
  document.getElementById('kpi-co2').textContent = `${co2.toFixed(2)} kg`;
  document.getElementById('kpi-co2-note').textContent = `≈${(co2 / 21).toFixed(2)} trees · ${Math.round(wasted * 80)} phone charges`;
  const flow = currentFlowTotal();
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('kpi-water-flow', `${flow.toFixed(1)} L/min`);
  set('kpi-water-today', `${totalWaterToday().toFixed(1)} L used today`);
  set('kpi-water-wasted', `${sim.total_wasted_litres.toFixed(1)} L`);
  set('kpi-water-reused', `${sim.total_reused_litres.toFixed(1)} L`);
  const diverted = materialStats ? materialStats.diverted_items : 0;
  const rate = materialStats ? materialStats.diversion_rate_pct : 0;
  set('kpi-plastic', `${Math.round(materialStats?.plastic_diverted_pcs || 0)} pcs`);
  set('kpi-plastic-note', `${rate}% diverted · ${Math.round(diverted)} items`);
}

function urgencyScore(problem) {
  if (problem.kind === 'water_waste') {
    const ageMs = Math.max(0, Date.now() - Date.parse(problem.created_at));
    return Number(problem.flow_lpm || 0) * 40
      + Math.min(ageMs / 60_000, 120) * 1.5
      + Number(problem.wasted_litres || 0) * 8;
  }
  const ageMs = Math.max(0, Date.now() - Date.parse(problem.created_at));
  return Number(problem.power_kw || 0) * 100
    + Math.min(ageMs / 60_000, 120) * 1.5
    + Number(problem.wasted_kwh || 0) * 500;
}

function urgencyLevel(problem) {
  if (problem.kind === 'water_waste') {
    const ageMinutes = Math.max(0, Date.now() - Date.parse(problem.created_at)) / 60_000;
    if ((problem.flow_lpm || 0) >= 6 || (problem.wasted_litres || 0) >= 20 || ageMinutes >= 30) return 'Critical';
    if ((problem.flow_lpm || 0) >= 2 || (problem.wasted_litres || 0) >= 5 || ageMinutes >= 10) return 'High';
    return 'Moderate';
  }
  const ageMinutes = Math.max(0, Date.now() - Date.parse(problem.created_at)) / 60_000;
  if (problem.power_kw >= 2.5 || problem.wasted_kwh >= 0.1 || ageMinutes >= 30) return 'Critical';
  if (problem.power_kw >= 1.25 || problem.wasted_kwh >= 0.03 || ageMinutes >= 10) return 'High';
  return 'Moderate';
}

function emptyMarkup(title, message) {
  return `<div class="empty-state"><span class="empty-icon">✓</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`;
}

function energyProblemMarkup(problem, index) {
  const level = urgencyLevel(problem);
  const tone = level === 'Critical' ? 'rose' : level === 'High' ? 'amber' : 'blue';
  const age = formatDuration(Date.now() - Date.parse(problem.created_at));
  const power = Number(problem.power_kw || 0);
  const wasted = Number(problem.wasted_kwh || 0);
  const problemId = escapeHtml(problem.id);
  return `
    <article class="problem-card ${level.toLowerCase()}">
      <div class="problem-main">
        <div class="problem-title-line">
          <span class="rank-chip ${index === 0 ? 'top' : ''}">${index + 1}</span>
          <span class="problem-room">${escapeHtml(problem.room_name)}</span>
          <span class="badge rose">● Active waste</span>
          <span class="badge ${tone}">${level}</span>
        </div>
        <p class="problem-description">${escapeHtml(problem.description)}</p>
        <div class="problem-metrics">
          <span>ϟ ${power.toFixed(2)} kW now</span>
          <span>◷ Active ${age}</span>
          <span class="waste-metric">${wasted.toFixed(3)} kWh · ₹${(wasted * RATE_PER_KWH).toFixed(2)} wasted</span>
        </div>
        <p class="problem-rate">Current burn rate: ₹${(power * RATE_PER_KWH).toFixed(2)} per hour</p>
      </div>
      <div class="problem-actions"><button class="action-button resolve" type="button" data-action="resolve-energy" data-id="${problemId}">✓ Mark Fixed</button></div>
    </article>`;
}

function waterProblemMarkup(problem, index) {
  const level = urgencyLevel(problem);
  const tone = level === 'Critical' ? 'rose' : level === 'High' ? 'amber' : 'blue';
  const age = formatDuration(Date.now() - Date.parse(problem.created_at));
  const flow = Number(problem.flow_lpm || 0);
  const wasted = Number(problem.wasted_litres || 0);
  const problemId = escapeHtml(problem.id);
  const isLeak = /leak/i.test(problem.category || '') || /leak/i.test(problem.description || '');
  return `
    <article class="problem-card ${level.toLowerCase()}">
      <div class="problem-main">
        <div class="problem-title-line">
          <span class="rank-chip ${index === 0 ? 'top' : ''}">${index + 1}</span>
          <span class="problem-room">${escapeHtml(problem.room_name)}</span>
          <span class="badge blue">≋ ${isLeak ? 'Leak' : 'Tap open'}</span>
          <span class="badge ${tone}">${level}</span>
        </div>
        <p class="problem-description">${escapeHtml(problem.description)}</p>
        <div class="problem-metrics">
          <span>💧 ${flow.toFixed(1)} L/min now</span>
          <span>◷ Active ${age}</span>
          <span class="waste-metric">${wasted.toFixed(1)} L wasted</span>
        </div>
        <p class="problem-rate">Reuse it: route greywater to gardening instead of draining it.</p>
      </div>
      <div class="problem-actions">
        <button class="action-button resolve" type="button" data-action="reuse-water" data-id="${problemId}">♻ Reuse</button>
        <button class="action-button resolve" type="button" data-action="resolve-water" data-id="${problemId}">✓ Fix leak</button>
      </div>
    </article>`;
}

function genericProblemMarkup(problem, index, badgeLabel) {
  const problemId = escapeHtml(problem.id);
  const inProgress = problem.status === 'in-progress';
  return `
    <article class="report-card">
      <div class="report-card-head">
        <span class="problem-room">${escapeHtml(problem.room_name)}</span>
        <span class="badge ${inProgress ? 'amber' : 'rose'}">${badgeLabel} · ${inProgress ? 'In progress' : 'Open'}</span>
        <span class="report-date">${escapeHtml(formatDate(problem.created_at))}</span>
      </div>
      <p class="report-category">${escapeHtml(problem.category)}</p>
      <p class="report-description">${escapeHtml(problem.description)}</p>
      <div class="report-card-foot">
        <span>Reported by ${escapeHtml(problem.reporter_name)} · ${problemId.slice(0, 8)}</span>
        <span class="report-card-actions">
          ${!inProgress ? `<button class="action-button" type="button" data-action="start-work" data-id="${problemId}">Start work</button>` : ''}
          <button class="action-button resolve" type="button" data-action="resolve-report" data-id="${problemId}">✓ Mark Fixed</button>
        </span>
      </div>
    </article>`;
}

function maintenanceProblemMarkup(problem) {
  const inProgress = problem.status === 'in-progress';
  const problemId = escapeHtml(problem.id);
  return `
    <article class="report-card">
      <div class="report-card-head">
        <span class="problem-room">${escapeHtml(problem.room_name)}</span>
        <span class="badge ${inProgress ? 'amber' : 'rose'}">${inProgress ? 'In progress' : 'Open'}</span>
        <span class="report-date">${escapeHtml(formatDate(problem.created_at))}</span>
      </div>
      <p class="report-category">${escapeHtml(problem.category)}</p>
      <p class="report-description">${escapeHtml(problem.description)}</p>
      <div class="report-card-foot">
        <span>Reported by ${escapeHtml(problem.reporter_name)} · ${problemId.slice(0, 8)}</span>
        <span class="report-card-actions">
          ${!inProgress ? `<button class="action-button" type="button" data-action="start-work" data-id="${problemId}">Start work</button>` : ''}
          <button class="action-button resolve" type="button" data-action="resolve-report" data-id="${problemId}">✓ Mark Fixed</button>
        </span>
      </div>
    </article>`;
}

function renderProblems() {
  const urgent = activeEnergyProblems().sort((a, b) => urgencyScore(b) - urgencyScore(a));
  const urgentMarkup = urgent.length
    ? urgent.map(energyProblemMarkup).join('')
    : emptyMarkup('All clear!', 'No active energy waste detected. Empty rooms are switched off.');
  const dashEl = document.getElementById('dashboard-urgent-list');
  if (dashEl) dashEl.innerHTML = urgentMarkup;
  const dashCount = document.getElementById('dashboard-alert-count');
  if (dashCount) dashCount.textContent = String(urgent.length);

  const water = activeWaterProblems().sort((a, b) => urgencyScore(b) - urgencyScore(a));
  const waterMarkup = water.length
    ? water.map(waterProblemMarkup).join('')
    : emptyMarkup('No leaks!', 'All taps are off and no leaks detected.');
  const waterList = document.getElementById('water-list');
  if (waterList) waterList.innerHTML = waterMarkup;
  const waterAlertCount = document.getElementById('water-alert-count');
  if (waterAlertCount) waterAlertCount.textContent = String(water.length);
  const waterCount = document.getElementById('water-count');
  if (waterCount) waterCount.textContent = String(water.length);

  // Alerts view with filter tabs.
  const allActive = [
    ...urgent.map((p) => ({ p, score: urgencyScore(p) })),
    ...water.map((p) => ({ p, score: urgencyScore(p) })),
  ].sort((a, b) => b.score - a.score).map((x) => x.p);
  const materialProblems = materialWasteProblems().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const maint = maintenanceProblems().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  let filtered = [];
  if (alertFilter === 'all') filtered = [...allActive, ...materialProblems, ...maint];
  else if (alertFilter === 'energy_waste') filtered = urgent;
  else if (alertFilter === 'water_waste') filtered = water;
  else if (alertFilter === 'material_waste') filtered = materialProblems;
  else if (alertFilter === 'maintenance') filtered = maint;
  const alertsMarkup = filtered.length
    ? filtered.map((problem, i) => {
      if (problem.kind === 'energy_waste') return energyProblemMarkup(problem, i);
      if (problem.kind === 'water_waste') return waterProblemMarkup(problem, i);
      return genericProblemMarkup(problem, i, problem.kind === 'material_waste' ? 'Material' : 'Maintenance');
    }).join('')
    : emptyMarkup('All clear!', 'No problems match this filter.');
  const alertsList = document.getElementById('alerts-list');
  if (alertsList) alertsList.innerHTML = alertsMarkup;
  const alertsCount = document.getElementById('alerts-count');
  if (alertsCount) alertsCount.textContent = String(allActive.length + materialProblems.length + maint.length);

  const reports = [...maint, ...materialProblems].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const reporterName = document.getElementById('reporter-name')?.value.trim().toLowerCase() || '';
  const visible = reportFilter === 'mine'
    ? reports.filter((problem) => problem.reporter_name.toLowerCase() === reporterName)
    : reports;
  const maintList = document.getElementById('maintenance-list');
  if (maintList) maintList.innerHTML = visible.length
    ? visible.map((p) => genericProblemMarkup(p, 0, p.kind === 'material_waste' ? 'Material' : p.status === 'in-progress' ? 'In progress' : 'Open')).join('')
    : emptyMarkup('No reports here', reportFilter === 'mine' ? 'No open reports match this reporter name.' : 'No open reports yet. Raise the first one here.');
  const reportsCount = document.getElementById('reports-count');
  if (reportsCount) reportsCount.textContent = String(reports.length);

  updateHeader();
}

function renderWeather() {
  if (!weather) return;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('weather-text', `${Number(weather.temperature_c).toFixed(0)}°C · ${weather.humidity_pct ?? '--'}%`);
  set('wx-temp', `${Number(weather.temperature_c).toFixed(1)}°C`);
  set('wx-cond', `${weather.condition || ''}${weather.live === false ? ' (offline)' : ''}`);
  set('wx-hum', `${weather.humidity_pct ?? '--'}%`);
  set('wx-feel', `feels ${weather.apparent_c != null ? Number(weather.apparent_c).toFixed(1) : '--'}°C · ${weather.campus || ''}`);
  set('wx-demand', String(weather.cooling_demand || '--').toUpperCase());
  set('wx-threshold', `${WASTE_THRESHOLD_KW.toFixed(2)} kW`);
  set('wx-note', weather.cooling_demand === 'high' ? 'hot day — AC expected, threshold relaxed' : weather.cooling_demand === 'moderate' ? 'warm — normal threshold' : 'cool — strict threshold');
  set('weather-sub', `${weather.campus || 'Campus'}: ${weather.condition || ''}, ${weather.temperature_c}°C, humidity ${weather.humidity_pct}%. Source: ${weather.source || 'open-meteo'}${weather.cached ? ' (cached)' : ''}.`);
  const tag = document.getElementById('weather-live-tag');
  if (tag) tag.textContent = weather.live === false ? 'offline estimate' : weather.cached ? 'cached' : 'live';
  set('impact-weather', `${Number(weather.temperature_c).toFixed(0)}°C ${weather.condition || ''}`);
  set('impact-weather-note', `cooling demand ${weather.cooling_demand || '--'} · threshold ${WASTE_THRESHOLD_KW.toFixed(2)} kW`);
}

function renderMaterials() {
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  if (materialStats) {
    set('mat-diverted', `${Math.round(materialStats.diverted_items)} pcs`);
    set('mat-diversion-note', `${materialStats.diversion_rate_pct}% diversion`);
    set('mat-recycled', `${Math.round(materialStats.totals?.recycled || 0)} pcs`);
    set('mat-reused', `${Math.round(materialStats.totals?.reused || 0)} pcs`);
    set('mat-disposed', `${Math.round(materialStats.totals?.disposed || 0)} pcs`);
    set('mat-co2', `${materialStats.plastic_co2_avoided_kg || 0} kg CO₂ avoided`);
    set('materials-diversion', `${materialStats.diversion_rate_pct}%`);
    set('impact-diversion', `${materialStats.diversion_rate_pct}%`);
    set('impact-diversion-note', `${Math.round(materialStats.diverted_items)} diverted of ${Math.round(materialStats.total_items)}`);
    set('impact-plastic', `${Math.round(materialStats.plastic_diverted_pcs || 0)} pcs`);
    set('impact-plastic-co2', `${materialStats.plastic_co2_avoided_kg || 0} kg CO₂ avoided`);
    const breakdown = document.getElementById('materials-breakdown');
    if (breakdown) {
      const entries = Object.entries(materialStats.by_material || {});
      breakdown.innerHTML = entries.length
        ? entries.map(([mat, v]) => `<tr><td><strong>${escapeHtml(mat)}</strong></td><td class="numeric">${Math.round(v.disposed || 0)}</td><td class="numeric">${Math.round(v.recycled || 0)}</td><td class="numeric">${Math.round(v.reused || 0)}</td></tr>`).join('')
        : `<tr><td colspan="4" style="text-align:center;color:#5f7f9c">No logs yet — log plastic recycled to start.</td></tr>`;
    }
  }
  const list = document.getElementById('materials-list');
  if (list) {
    list.innerHTML = materialLogs.length
      ? materialLogs.slice(0, 20).map((log) => `
        <article class="report-card">
          <div class="report-card-head">
            <span class="problem-room">${escapeHtml(log.room_name)}</span>
            <span class="badge ${log.action === 'disposed' ? 'rose' : log.action === 'reused' ? 'amber' : 'green'}">${escapeHtml(log.action)}</span>
            <span class="report-date">${escapeHtml(formatDate(log.created_at))}</span>
          </div>
          <p class="report-category">${escapeHtml(log.material)} · ${escapeHtml(String(log.quantity))} ${escapeHtml(log.unit)}</p>
          <p class="report-description">${escapeHtml(log.note || `Logged by ${log.reporter_name}`)}</p>
          <div class="report-card-foot">
            <span>${escapeHtml(log.reporter_name)} · ${escapeHtml(String(log.id).slice(0, 8))}</span>
            <span class="report-card-actions"><button class="action-button delete" type="button" data-action="delete-material" data-id="${escapeHtml(log.id)}">Delete</button></span>
          </div>
        </article>`).join('')
      : emptyMarkup('No material logs', 'Log recycled plastic to raise the diversion rate.');
  }
}

function roomStatus(room) {
  if (activeEnergyProblems().some((problem) => problem.room_id === room.id)) return 'wasting';
  if (activeWaterProblems().some((problem) => problem.room_id === room.id)) return 'wasting';
  return sim.rooms[room.id]?.occupied ? 'occupied' : 'empty';
}

function waterStatus(room) {
  const state = sim.rooms[room.id];
  if (!state) return 'off';
  if (state.leak) return 'leak';
  if (state.taps_on && !state.occupied) return 'wasting';
  if (state.taps_on) return 'on';
  return 'off';
}

function sparkline(roomId) {
  const values = sim.readings[roomId] || [];
  const sample = values.slice(-30).map((reading) => Number(reading.power_kw || 0));
  if (sample.length < 2) sample.unshift(sim.rooms[roomId]?.power_kw || 0, sim.rooms[roomId]?.power_kw || 0);
  const max = Math.max(0.5, ...sample) * 1.15;
  const points = sample.map((value, index) => {
    const x = sample.length < 2 ? 0 : (index / (sample.length - 1)) * 240;
    const y = 40 - (value / max) * 34;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = roomStatus(ROOMS.find((room) => room.id === roomId)) === 'wasting' ? '#ff4d6d' : '#00e5ff';
  return `<svg class="sparkline" viewBox="0 0 240 46" role="img" aria-label="Recent power readings"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px ${color})"/></svg>`;
}

function roomCardMarkup(room, compact = false) {
  const state = sim.rooms[room.id];
  if (!state) return '';
  const status = roomStatus(room);
  const stateLabel = status === 'wasting' ? 'Wasting' : status === 'occupied' ? 'Occupied' : 'Empty';
  const pillClass = status === 'wasting' ? 'waste-state' : status === 'empty' ? 'empty-state-pill' : '';
  const applianceButtons = APPLIANCES.map((appliance) => {
    const active = state.appliancesOn.includes(appliance.key);
    const kw = room.appliances[appliance.rating];
    return `<button class="appliance-button ${active ? 'on' : ''}" type="button" data-action="toggle-appliance" data-room-id="${room.id}" data-appliance="${appliance.key}" aria-pressed="${active}" title="Toggle ${appliance.label}">
      <strong>${active ? 'ON' : 'OFF'}</strong>${escapeHtml(appliance.label)}<small>${kw.toFixed(2)} kW</small>
    </button>`;
  }).join('');
  const wState = waterStatus(room);
  const wLabel = wState === 'leak' ? 'Leak!' : wState === 'wasting' ? 'Tap open (empty)' : wState === 'on' ? 'Taps on' : 'Taps off';
  const waterControls = `
      <div class="appliance-heading">Water · ${(state.flow_lpm || 0).toFixed(1)} L/min · ${(state.today_litres || 0).toFixed(1)} L today</div>
      <div class="appliance-grid" style="grid-template-columns:1fr 1fr">
        <button class="appliance-button ${state.taps_on ? 'on' : ''}" type="button" data-action="toggle-taps" data-room-id="${room.id}" aria-pressed="${state.taps_on}"><strong>${state.taps_on ? 'ON' : 'OFF'}</strong>Taps<small>${wLabel}</small></button>
        <button class="appliance-button ${state.leak ? 'on' : ''}" type="button" data-action="toggle-leak" data-room-id="${room.id}" aria-pressed="${state.leak}" style="${state.leak ? 'border-color:rgba(255,77,109,0.6);color:#ff9aae' : ''}"><strong>${state.leak ? 'LEAK' : 'OK'}</strong>Leak<small>${state.leak ? 'fix me' : 'no leak'}</small></button>
      </div>`;
  return `
    <article class="room-card ${status}">
      <div class="room-card-header">
        <div><div class="room-name">${escapeHtml(room.name)}</div><div class="room-meta">${escapeHtml(room.type)} · ${room.capacity} seats</div></div>
        <span class="room-state ${pillClass}"><span class="room-state-dot"></span>${stateLabel}</span>
      </div>
      ${sparkline(room.id)}
      <div class="room-power"><strong>${state.power_kw.toFixed(2)} kW</strong><span>right now</span></div>
      <div class="room-energy">${state.today_kwh.toFixed(2)} kWh today · ₹${(state.today_kwh * RATE_PER_KWH).toFixed(2)} · ${co2For(state.today_kwh).toFixed(2)} kg CO₂</div>
      <div class="occupancy-control"><span>Occupancy</span><button class="switch" type="button" data-action="toggle-occupancy" data-room-id="${room.id}" role="switch" aria-checked="${state.occupied}" aria-label="Toggle occupancy for ${escapeHtml(room.name)}"></button><span>${state.occupied ? 'In use' : 'Empty'}</span></div>
      ${compact ? `${waterControls}` : `<div class="appliance-heading">Appliances · tap to switch</div><div class="appliance-grid">${applianceButtons}</div>${waterControls}`}
    </article>`;
}

function waterRoomCardMarkup(room) {
  const state = sim.rooms[room.id];
  if (!state) return '';
  const wState = waterStatus(room);
  const active = activeWaterProblems().find((p) => p.room_id === room.id);
  return `
    <article class="room-card ${active ? 'wasting' : state.occupied ? 'occupied' : 'empty'}">
      <div class="room-card-header">
        <div><div class="room-name">${escapeHtml(room.name)}</div><div class="room-meta">${wState} · ${(state.flow_lpm || 0).toFixed(1)} L/min</div></div>
        <span class="room-state ${active ? 'waste-state' : ''}"><span class="room-state-dot"></span>${active ? 'Leaking' : wState}</span>
      </div>
      <div class="room-power"><strong>${(state.flow_lpm || 0).toFixed(1)} L/min</strong><span>right now</span></div>
      <div class="room-energy">${(state.today_litres || 0).toFixed(1)} L today · ${active ? `${Number(active.wasted_litres || 0).toFixed(1)} L wasted` : 'no active leak'}</div>
      <div class="appliance-grid" style="grid-template-columns:1fr 1fr;margin-top:10px">
        <button class="appliance-button ${state.taps_on ? 'on' : ''}" type="button" data-action="toggle-taps" data-room-id="${room.id}"><strong>${state.taps_on ? 'ON' : 'OFF'}</strong>Taps</button>
        <button class="appliance-button ${state.leak ? 'on' : ''}" type="button" data-action="toggle-leak" data-room-id="${room.id}"><strong>${state.leak ? 'LEAK' : 'OK'}</strong>Leak</button>
      </div>
    </article>`;
}

function renderRooms() {
  const dashGrid = document.getElementById('dashboard-room-grid');
  if (dashGrid) dashGrid.innerHTML = ROOMS.map((room) => roomCardMarkup(room, true)).join('');
  const roomsGrid = document.getElementById('rooms-page-grid');
  if (roomsGrid) roomsGrid.innerHTML = ROOMS.map((room) => roomCardMarkup(room, false)).join('');
  const waterGrid = document.getElementById('water-room-grid');
  if (waterGrid) waterGrid.innerHTML = ROOMS.map(waterRoomCardMarkup).join('');
  const roomsCount = document.getElementById('rooms-count');
  if (roomsCount) roomsCount.textContent = String(ROOMS.length);
}

function renderImpact() {
  const wasted = sim.total_wasted_kwh;
  const rupees = wasted * RATE_PER_KWH;
  const co2 = co2For(wasted);
  const trees = co2 / 21;
  const phones = wasted * 80;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('impact-energy', `${wasted.toFixed(2)} kWh`);
  set('impact-phones', `≈ ${Math.round(phones)} phone charges`);
  set('impact-cost', `₹${rupees.toFixed(2)}`);
  set('impact-co2', `${co2.toFixed(2)} kg`);
  set('impact-trees', trees.toFixed(2));
  set('impact-water', `${sim.total_wasted_litres.toFixed(1)} L wasted`);
  set('impact-water-note', `${sim.total_reused_litres.toFixed(1)} L reused · ${totalWaterToday().toFixed(0)} L used today`);
  set('water-flow-now', `${currentFlowTotal().toFixed(1)} L/min`);
  set('water-used-today', `${totalWaterToday().toFixed(1)} L`);
  set('water-wasted-total', `${sim.total_wasted_litres.toFixed(1)} L`);
  set('water-reused-total', `${sim.total_reused_litres.toFixed(1)} L`);

  const rows = ROOMS.map((room) => ({
    ...room,
    wasted: Number(sim.wasteByRoom[room.id] || 0),
    score: Math.max(0, Math.round(100 - Number(sim.wasteByRoom[room.id] || 0) * 10)),
  })).sort((a, b) => a.wasted - b.wasted);
  const effRows = document.getElementById('efficiency-rows');
  if (effRows) effRows.innerHTML = rows.map((room, index) => `
    <tr><td><span class="table-rank">${index + 1}</span></td><td><strong>${escapeHtml(room.name)}</strong></td>
    <td class="numeric">${room.wasted.toFixed(4)} kWh</td>
    <td class="numeric"><span class="score-track"><span class="score-fill" style="width:${room.score}%"></span></span>${room.score}</td></tr>`).join('');

  const worst = [...rows].sort((a, b) => b.wasted - a.wasted)[0];
  const projection = document.getElementById('projection');
  if (projection) {
    if (worst && worst.wasted > 0.0005) {
      const monthKwh = worst.wasted * 30;
      projection.innerHTML = `<h3>Projection — fix ${escapeHtml(worst.name)}</h3>
        <p>If ${escapeHtml(worst.name)} is switched off whenever it is empty, the campus could save
        <strong>₹${(monthKwh * RATE_PER_KWH).toFixed(0)}/month</strong> and avoid
        <strong>${co2For(monthKwh).toFixed(1)} kg of CO₂</strong> each month.</p>
        <p>Based on ${worst.wasted.toFixed(4)} kWh wasted today × 30 days.</p>`;
    } else {
      projection.innerHTML = '<h3>Projection</h3><p>No significant waste recorded yet. Savings estimates appear after energy waste is detected.</p>';
    }
  }
  const waterWorst = ROOMS.map((r) => ({ ...r, wasted: Number(sim.waterWasteByRoom[r.id] || 0) })).sort((a, b) => b.wasted - a.wasted)[0];
  const projW = document.getElementById('projection-water');
  if (projW) {
    if (waterWorst && waterWorst.wasted > 0.5) {
      const monthL = waterWorst.wasted * 30;
      projW.innerHTML = `<h3>Water projection — fix ${escapeHtml(waterWorst.name)}</h3><p>At ${(waterWorst.wasted).toFixed(1)} L wasted today, that's <strong>${monthL.toFixed(0)} L/month</strong> — enough for <strong>${Math.round(monthL / 8)} toilet flushes</strong>. Reuse it for gardening instead.</p>`;
    } else {
      projW.innerHTML = '<h3>Water projection</h3><p>No significant water waste yet. Trigger a leak to see monthly savings.</p>';
    }
  }
}

function renderLive() {
  updateKpis();
  updateHeader();
  renderRooms();
  renderImpact();
  renderWeather();
  renderMaterials();
  drawPowerChart();
}

function drawPowerChart() {
  const canvas = document.getElementById('power-chart');
  if (!canvas || !canvas.isConnected) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = rect.width;
  const height = rect.height;
  const left = 34;
  const right = 8;
  const top = 10;
  const bottom = 18;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxPower = Math.max(3, ...ROOMS.flatMap((room) => (sim.readings[room.id] || []).map((reading) => reading.power_kw))) * 1.1;
  context.clearRect(0, 0, width, height);
  context.font = '9px DM Sans, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = top + (plotHeight * tick) / 4;
    context.strokeStyle = 'rgba(0,229,255,0.12)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();
    context.fillStyle = '#5f7f9c';
    context.fillText(`${(maxPower * (1 - tick / 4)).toFixed(1)}`, left - 7, y);
  }
  ROOMS.forEach((room, roomIndex) => {
    const values = (sim.readings[room.id] || []).slice(-50);
    if (values.length < 2) return;
    context.strokeStyle = ROOM_COLORS[roomIndex % ROOM_COLORS.length];
    context.lineWidth = roomIndex === 0 ? 2.2 : 1.6;
    context.globalAlpha = 0.92;
    context.shadowColor = ROOM_COLORS[roomIndex % ROOM_COLORS.length];
    context.shadowBlur = 8;
    context.beginPath();
    values.forEach((reading, index) => {
      const x = left + (index / Math.max(1, values.length - 1)) * plotWidth;
      const y = top + (1 - Math.min(maxPower, reading.power_kw) / maxPower) * plotHeight;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  });
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function renderLegend() {
  document.getElementById('chart-legend').innerHTML = ROOMS.map((room, index) =>
    `<span class="legend-item"><span class="legend-swatch" style="background:${ROOM_COLORS[index]}"></span>${escapeHtml(room.name)}</span>`,
  ).join('');
}

function showView(viewName) {
  if (!PAGE_INFO[viewName]) return;
  currentView = viewName;
  document.querySelectorAll('.view').forEach((view) => {
    const active = view.dataset.page === viewName;
    view.classList.toggle('active', active);
    view.hidden = !active;
  });
  document.querySelectorAll('.nav-link[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });
  updateHeader();
  if (viewName === 'impact') { renderImpact(); renderMaterials(); }
  if (viewName === 'rooms' || viewName === 'water') renderRooms();
  if (viewName === 'materials') refreshMaterials({ quiet: true });
  if (viewName === 'alerts' || viewName === 'reports') renderProblems();
  if (viewName === 'water') renderProblems();
  drawPowerChart();
  document.body.classList.remove('sidebar-open');
}

function fillReportFormOptions() {
  const roomOptions = ROOMS.map((room) =>
    `<option value="${room.id}">${escapeHtml(room.name)} — ${escapeHtml(room.type)}</option>`,
  ).join('');
  const reportRoom = document.getElementById('report-room');
  if (reportRoom) reportRoom.innerHTML = roomOptions;
  const materialRoom = document.getElementById('material-room');
  if (materialRoom) materialRoom.innerHTML = roomOptions;
  const catEl = document.getElementById('report-category');
  if (catEl) catEl.innerHTML = REPORT_CATEGORIES.map((category) =>
    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
  ).join('');
  const savedReporter = localStorage.getItem('wattwatch-reporter-name');
  if (savedReporter) {
    const rn = document.getElementById('reporter-name');
    if (rn) rn.value = savedReporter;
  }
  else if (authUser?.name) {
    const rn = document.getElementById('reporter-name');
    if (rn) rn.value = authUser.name;
  }
}

async function createMaintenanceProblem(form) {
  const values = new FormData(form);
  const reporterName = String(values.get('reporter_name') || '').trim();
  const roomId = String(values.get('room_id') || '');
  const room = ROOMS.find((item) => item.id === roomId);
  const description = String(values.get('description') || '').trim();
  const kind = String(values.get('kind') || 'maintenance');
  const validKind = ['maintenance', 'water_waste', 'material_waste'].includes(kind) ? kind : 'maintenance';
  if (!room || reporterName.length < 2 || description.length < 5) {
    showToast('Enter your name and describe the problem in at least five characters.', 'error');
    return;
  }
  try {
    await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify({
        kind: validKind,
        room_id: room.id,
        room_name: room.name,
        category: String(values.get('category') || 'Other'),
        description,
        reporter_name: reporterName,
      }),
    });
    localStorage.setItem('wattwatch-reporter-name', reporterName);
    form.reset();
    document.getElementById('reporter-name').value = reporterName;
    fillReportFormOptions();
    await refreshProblems({ quiet: true });
    showToast(`Report raised for ${room.name}.`);
  } catch (error) {
    showToast(`Could not save the report: ${error.message}`, 'error');
  }
}

async function createMaterialLog(form) {
  const values = new FormData(form);
  const roomId = String(values.get('room_id') || values.get('room') || document.getElementById('material-room')?.value || '');
  const room = ROOMS.find((item) => item.id === roomId) || ROOMS[0];
  const material = String(document.getElementById('material-type')?.value || 'plastic');
  const quantity = Number(document.getElementById('material-qty')?.value || 1);
  const unit = String(document.getElementById('material-unit')?.value || 'pcs');
  const action = String(document.getElementById('material-action')?.value || 'recycled');
  const note = String(document.getElementById('material-note')?.value || '');
  if (!Number.isFinite(quantity) || quantity <= 0) {
    showToast('Enter a quantity of at least 1.', 'error');
    return;
  }
  try {
    await apiRequest('/api/materials', {
      method: 'POST',
      body: JSON.stringify({
        room_id: room.id,
        room_name: room.name,
        material, quantity, unit, action,
        reporter_name: authUser?.name || localStorage.getItem('wattwatch-reporter-name') || 'Demo Student',
        note,
      }),
    });
    await refreshMaterials({ quiet: true });
    showToast(`${Math.round(quantity)} ${material} ${action} in ${room.name} ♻`);
  } catch (error) {
    showToast(`Could not log material: ${error.message}`, 'error');
  }
}

async function createEnergyProblem(room, power) {
  try {
    const response = await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'energy_waste',
        room_id: room.id,
        room_name: room.name,
        category: 'Power wastage',
        description: `Empty room with equipment still running (${WASTE_THRESHOLD_KW.toFixed(2)} kW threshold).`,
        reporter_name: 'WattWatch sensor',
        power_kw: power,
        wasted_kwh: 0,
      }),
    });
    delete energyCreateRetryAfter[room.id];
    const index = problems.findIndex((problem) => problem.id === response.id);
    if (index === -1) problems.push(response);
    else problems[index] = response;
  } catch (error) {
    energyCreateRetryAfter[room.id] = Date.now() + 15_000;
    throw error;
  }
}

async function createWaterProblem(room, flow, isLeak) {
  try {
    const response = await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'water_waste',
        room_id: room.id,
        room_name: room.name,
        category: isLeak ? 'Pipe leak' : 'Tap left open',
        description: isLeak
          ? `Leak detected flowing at ${flow.toFixed(1)} L/min — fix it or reuse greywater.`
          : `Empty room with tap open at ${flow.toFixed(1)} L/min.`,
        reporter_name: 'WattWatch sensor',
        flow_lpm: flow,
        wasted_litres: 0,
      }),
    });
    delete waterCreateRetryAfter[room.id];
    const index = problems.findIndex((problem) => problem.id === response.id);
    if (index === -1) problems.push(response);
    else problems[index] = response;
  } catch (error) {
    waterCreateRetryAfter[room.id] = Date.now() + 15_000;
    throw error;
  }
}

async function patchProblem(problemId, changes) {
  const updated = await apiRequest(`/api/problems/${encodeURIComponent(problemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  if (!updated.deleted) {
    const index = problems.findIndex((problem) => problem.id === problemId);
    if (index !== -1) problems[index] = updated;
  }
  return updated;
}

async function removeProblem(problemId) {
  await apiRequest(`/api/problems/${encodeURIComponent(problemId)}`, { method: 'DELETE' });
  problems = problems.filter((problem) => problem.id !== problemId);
}

async function resolveEnergyProblem(problemId) {
  const problem = problems.find((item) => item.id === problemId);
  if (!problem) return;
  try {
    await removeProblem(problemId);
    const roomState = sim.rooms[problem.room_id];
    if (roomState) {
      roomState.appliancesOn = [];
      roomState.occupied = false;
      roomState.power_kw = STANDBY_KW;
      sim.streaks[problem.room_id] = 0;
    }
    saveSimulation();
    renderProblems();
    renderLive();
    showToast(`${problem.room_name} switched off — problem removed.`);
  } catch (error) {
    showToast(`Could not resolve the problem: ${error.message}`, 'error');
  }
}

async function resolveWaterProblem(problemId, reuse = false) {
  const problem = problems.find((item) => item.id === problemId);
  if (!problem) return;
  try {
    const wasted = Number(problem.wasted_litres || 0);
    if (reuse && wasted > 0) {
      sim.total_reused_litres += wasted;
      showToast(`${wasted.toFixed(1)} L greywater routed to gardening in ${problem.room_name} ♻`);
    }
    await removeProblem(problemId);
    const roomState = sim.rooms[problem.room_id];
    if (roomState) {
      roomState.taps_on = false;
      roomState.leak = false;
      roomState.flow_lpm = 0;
      sim.waterStreaks[problem.room_id] = 0;
    }
    saveSimulation();
    renderProblems();
    renderLive();
    if (!reuse) showToast(`${problem?.room_name || 'Leak'} fixed and deleted from the queue.`);
  } catch (error) {
    showToast(`Could not resolve water problem: ${error.message}`, 'error');
  }
}

async function deleteMaterialLog(logId) {
  try {
    await apiRequest(`/api/materials/${encodeURIComponent(logId)}`, { method: 'DELETE' });
    await refreshMaterials({ quiet: true });
    showToast('Material log deleted.');
  } catch (error) {
    showToast(`Could not delete log: ${error.message}`, 'error');
  }
}

async function resolveMaintenanceProblem(problemId) {
  const problem = problems.find((item) => item.id === problemId);
  try {
    await removeProblem(problemId);
    renderProblems();
    showToast(`${problem?.room_name || 'Problem'} fixed and deleted from the queue.`);
  } catch (error) {
    showToast(`Could not resolve the report: ${error.message}`, 'error');
  }
}

async function startMaintenanceWork(problemId) {
  try {
    await patchProblem(problemId, { status: 'in-progress' });
    renderProblems();
    showToast('Report moved to In progress.');
  } catch (error) {
    showToast(`Could not update the report: ${error.message}`, 'error');
  }
}

function toggleOccupancy(roomId) {
  const state = sim.rooms[roomId];
  if (!state) return;
  state.occupied = !state.occupied;
  if (state.occupied && state.appliancesOn.length === 0) state.appliancesOn = ['lights', 'fans'];
  sim.streaks[roomId] = 0;
  sim.waterStreaks[roomId] = 0;
  saveSimulation();
  renderLive();
}

function toggleTaps(roomId) {
  const state = sim.rooms[roomId];
  if (!state) return;
  state.taps_on = !state.taps_on;
  sim.waterStreaks[roomId] = 0;
  saveSimulation();
  renderLive();
}

function toggleLeak(roomId) {
  const state = sim.rooms[roomId];
  if (!state) return;
  state.leak = !state.leak;
  sim.waterStreaks[roomId] = 0;
  saveSimulation();
  renderLive();
  if (state.leak) showToast(`Leak simulated in ${roomId} — watch Water queue.`, 'error');
}

function toggleAppliance(roomId, key) {
  const state = sim.rooms[roomId];
  if (!state || !APPLIANCES.some((item) => item.key === key)) return;
  state.appliancesOn = state.appliancesOn.includes(key)
    ? state.appliancesOn.filter((item) => item !== key)
    : [...state.appliancesOn, key];
  saveSimulation();
  renderLive();
}

function setSimulationSpeed(milliseconds) {
  sim.tick_ms = milliseconds === 1000 ? 1000 : 5000;
  saveSimulation();
  document.querySelectorAll('[data-speed]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.speed) === sim.tick_ms);
  });
  restartTickTimer();
  renderLive();
}

async function resetSimulationDay() {
  if (!window.confirm('Reset the simulator day? This clears room readings, energy/water totals and waste alerts. Maintenance reports are kept.')) return;
  const currentWaste = [...activeEnergyProblems(), ...activeWaterProblems()];
  await Promise.allSettled(currentWaste.map((problem) => removeProblem(problem.id)));
  const reporter = localStorage.getItem('wattwatch-reporter-name');
  const fresh = buildInitialSimulation();
  sim = fresh;
  saveSimulation();
  if (reporter) localStorage.setItem('wattwatch-reporter-name', reporter);
  renderProblems();
  renderLive();
  showToast('Fresh simulator day started. Maintenance reports were kept.');
}

function tapsOffAll() {
  ROOMS.forEach((room) => {
    sim.rooms[room.id].taps_on = false;
    sim.rooms[room.id].leak = false;
    sim.rooms[room.id].flow_lpm = 0;
    sim.waterStreaks[room.id] = 0;
  });
  saveSimulation();
  renderLive();
  showToast('All taps off, leaks sealed.');
}

function reuseGreywater() {
  const waste = activeWaterProblems();
  if (!waste.length) {
    sim.total_reused_litres += 20;
    saveSimulation();
    renderLive();
    showToast('20 L greywater reused for gardening ♻ (demo).');
    return;
  }
  waste.forEach((p) => resolveWaterProblem(p.id, true));
}

function emptyAllRooms() {
  ROOMS.forEach((room) => {
    sim.rooms[room.id].occupied = false;
    sim.streaks[room.id] = 0;
  });
  saveSimulation();
  renderLive();
  showToast('All rooms emptied — watch for waste alerts.');
}

function fillAllRooms() {
  ROOMS.forEach((room) => {
    const state = sim.rooms[room.id];
    state.occupied = true;
    if (state.appliancesOn.length === 0) state.appliancesOn = ['lights', 'fans'];
    sim.streaks[room.id] = 0;
  });
  saveSimulation();
  renderLive();
  showToast('All rooms are occupied again.');
}

function triggerDemoWaste() {
  const candidate = ROOMS
    .filter((room) => sim.rooms[room.id].occupied && sim.rooms[room.id].appliancesOn.length > 0)
    .sort((a, b) => sim.rooms[b.id].power_kw - sim.rooms[a.id].power_kw)[0]
    || ROOMS.find((room) => sim.rooms[room.id].occupied);
  if (!candidate) {
    showToast('No occupied room is available to empty.', 'error');
    return;
  }
  const state = sim.rooms[candidate.id];
  if (state.appliancesOn.length === 0) state.appliancesOn = ['lights', 'ac'];
  state.occupied = false;
  sim.streaks[candidate.id] = 0;
  saveSimulation();
  renderLive();
  showToast(`${candidate.name} is empty with equipment on. An alert should appear after two readings.`);
}

function triggerDemoWater() {
  const candidate = ROOMS.find((room) => !sim.rooms[room.id].leak)
    || ROOMS[0];
  const state = sim.rooms[candidate.id];
  state.occupied = false;
  state.taps_on = true;
  if (Math.random() < 0.5) state.leak = true;
  sim.waterStreaks[candidate.id] = 0;
  saveSimulation();
  renderLive();
  showToast(`${candidate.name} leaking at ~${(state.flow_lpm || 6).toFixed(1)} L/min. Alert after two readings.`, 'error');
}

async function triggerDemoReuse() {
  const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
  try {
    await apiRequest('/api/materials', {
      method: 'POST',
      body: JSON.stringify({
        room_id: room.id,
        room_name: room.name,
        material: 'plastic',
        quantity: 20,
        unit: 'pcs',
        action: 'recycled',
        reporter_name: authUser?.name || 'Demo Student',
        note: 'Demo: refill-station drive',
      }),
    });
    await refreshMaterials({ quiet: true });
    showToast(`20 plastic bottles recycled in ${room.name} ♻`);
  } catch (error) {
    showToast(`Could not log reuse: ${error.message}`, 'error');
  }
}

async function simulatorTick() {
  if (tickInProgress) return;
  if (!isAuthed()) return;
  tickInProgress = true;
  sim.tick += 1;
  const pendingRequests = [];
  for (const room of ROOMS) {
    const roomState = sim.rooms[room.id];
    if (!roomState) continue;
    if (!roomState.occupied && roomState.appliancesOn.length === 0 && Math.random() < 0.03) {
      roomState.appliancesOn = randomWasteAppliances();
    }
    const power = simulatePower(room, roomState.occupied, roomState.appliancesOn);
    roomState.power_kw = power;
    roomState.today_kwh += power * (sim.tick_ms / 3_600_000);
    const readings = sim.readings[room.id] || (sim.readings[room.id] = []);
    readings.push({ timestamp: Date.now(), power_kw: power });
    if (readings.length > 50) readings.splice(0, readings.length - 50);

    const looksLikeWaste = !roomState.occupied && power > WASTE_THRESHOLD_KW;
    sim.streaks[room.id] = looksLikeWaste ? (Number(sim.streaks[room.id]) || 0) + 1 : 0;
    const activeProblem = activeEnergyProblems().find((problem) => problem.room_id === room.id);
    if (activeProblem && !looksLikeWaste) {
      pendingRequests.push(removeProblem(activeProblem.id));
    } else if (activeProblem && looksLikeWaste) {
      const delta = power * (sim.tick_ms / 3_600_000);
      activeProblem.power_kw = power;
      activeProblem.wasted_kwh = Number(activeProblem.wasted_kwh || 0) + delta;
      sim.total_wasted_kwh += delta;
      sim.wasteByRoom[room.id] = Number(sim.wasteByRoom[room.id] || 0) + delta;
      pendingRequests.push(patchProblem(activeProblem.id, {
        power_kw: power,
        wasted_kwh: activeProblem.wasted_kwh,
      }));
    } else if (
      looksLikeWaste
      && sim.streaks[room.id] >= 2
      && Date.now() >= (energyCreateRetryAfter[room.id] || 0)
    ) {
      pendingRequests.push(createEnergyProblem(room, power));
    }

    // ---- Water simulation ----
    if (typeof roomState.taps_on !== 'boolean') roomState.taps_on = false;
    if (typeof roomState.leak !== 'boolean') roomState.leak = false;
    if (!roomState.occupied && !roomState.taps_on && !roomState.leak && Math.random() < 0.02) {
      roomState.taps_on = true; // tap accidentally left open
    }
    const flow = simulateFlow(room, roomState.occupied, roomState.taps_on, roomState.leak);
    roomState.flow_lpm = flow;
    const litresThisTick = flow * (sim.tick_ms / 60000);
    roomState.today_litres = Number((roomState.today_litres || 0) + litresThisTick);
    sim.total_water_litres = Number((sim.total_water_litres || 0) + litresThisTick);
    const looksLikeWaterWaste = roomState.leak || (!roomState.occupied && flow > WATER_THRESHOLD_LPM);
    sim.waterStreaks[room.id] = looksLikeWaterWaste ? (Number(sim.waterStreaks[room.id]) || 0) + 1 : 0;
    const activeWater = activeWaterProblems().find((problem) => problem.room_id === room.id);
    if (activeWater && !looksLikeWaterWaste) {
      pendingRequests.push(removeProblem(activeWater.id));
    } else if (activeWater && looksLikeWaterWaste) {
      activeWater.flow_lpm = flow;
      activeWater.wasted_litres = Number(activeWater.wasted_litres || 0) + litresThisTick;
      sim.total_wasted_litres += litresThisTick;
      sim.waterWasteByRoom[room.id] = Number(sim.waterWasteByRoom[room.id] || 0) + litresThisTick;
      pendingRequests.push(patchProblem(activeWater.id, {
        flow_lpm: flow,
        wasted_litres: activeWater.wasted_litres,
      }));
    } else if (
      looksLikeWaterWaste
      && sim.waterStreaks[room.id] >= 2
      && Date.now() >= (waterCreateRetryAfter[room.id] || 0)
    ) {
      pendingRequests.push(createWaterProblem(room, flow, roomState.leak));
    }
  }

  if (Date.now() - sim.last_shuffle >= 120_000) {
    sim.last_shuffle = Date.now();
    const candidates = [...ROOMS].sort(() => Math.random() - 0.5).slice(0, 2);
    candidates.forEach((room) => {
      const state = sim.rooms[room.id];
      state.occupied = !state.occupied;
      if (state.occupied) state.appliancesOn = randomOccupiedAppliances();
      else if (Math.random() < 0.35) state.appliancesOn = randomWasteAppliances();
      sim.streaks[room.id] = 0;
    });
  }

  saveSimulation();
  renderLive();
  try {
    const results = await Promise.allSettled(pendingRequests);
    const failed = results.some((result) => result.status === 'rejected');
    if (pendingRequests.length > 0 || failed) await refreshProblems({ quiet: true });
    if (failed) setBackendStatus(false);
  } finally {
    tickInProgress = false;
  }
}

function restartTickTimer() {
  if (tickTimer) window.clearInterval(tickTimer);
  tickTimer = window.setInterval(simulatorTick, sim.tick_ms);
}

function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'toggle-occupancy') toggleOccupancy(button.dataset.roomId);
  if (action === 'toggle-appliance') toggleAppliance(button.dataset.roomId, button.dataset.appliance);
  if (action === 'toggle-taps') toggleTaps(button.dataset.roomId);
  if (action === 'toggle-leak') toggleLeak(button.dataset.roomId);
  if (action === 'resolve-energy') resolveEnergyProblem(id);
  if (action === 'resolve-water') resolveWaterProblem(id, false);
  if (action === 'reuse-water') resolveWaterProblem(id, true);
  if (action === 'resolve-report') resolveMaintenanceProblem(id);
  if (action === 'start-work') startMaintenanceWork(id);
  if (action === 'delete-material') deleteMaterialLog(id);
}

function setupEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const authTabBtn = target.closest('[data-auth-tab]');
    if (authTabBtn) {
      authTab = authTabBtn.dataset.authTab;
      updateAuthTab();
      return;
    }
    const navButton = target.closest('[data-view]');
    if (navButton) {
      showView(navButton.dataset.view);
      return;
    }
    const actionButton = target.closest('[data-action]');
    if (actionButton) {
      handleAction(actionButton);
      return;
    }
    const filterButton = target.closest('[data-report-filter]');
    if (filterButton) {
      reportFilter = filterButton.dataset.reportFilter;
      document.querySelectorAll('[data-report-filter]').forEach((button) => {
        button.classList.toggle('active', button.dataset.reportFilter === reportFilter);
      });
      renderProblems();
      return;
    }
    const alertFilterBtn = target.closest('[data-alert-filter]');
    if (alertFilterBtn) {
      alertFilter = alertFilterBtn.dataset.alertFilter;
      document.querySelectorAll('[data-alert-filter]').forEach((button) => {
        button.classList.toggle('active', button.dataset.alertFilter === alertFilter);
      });
      renderProblems();
      return;
    }
    const speedButton = target.closest('[data-speed]');
    if (speedButton) {
      setSimulationSpeed(Number(speedButton.dataset.speed));
      return;
    }
    if (target.closest('#demo-waste')) triggerDemoWaste();
    if (target.closest('#demo-water') || target.closest('#demo-water-2')) triggerDemoWater();
    if (target.closest('#demo-reuse')) triggerDemoReuse();
    if (target.closest('#taps-off-all')) tapsOffAll();
    if (target.closest('#reuse-greywater')) reuseGreywater();
    if (target.closest('#refresh-materials')) refreshMaterials();
    if (target.closest('#empty-all')) emptyAllRooms();
    if (target.closest('#fill-all')) fillAllRooms();
    if (target.closest('#reset-day')) resetSimulationDay();
    if (target.closest('#logout-btn') || target.closest('#sidebar-logout')) handleLogout();
    if (target.closest('#fill-demo')) {
      document.getElementById('login-email').value = 'demo@wattwatch.local';
      document.getElementById('login-password').value = 'demo1234';
      authTab = 'login';
      updateAuthTab();
      setAuthError('');
      return;
    }
    if (target.closest('#mobile-menu')) document.body.classList.add('sidebar-open');
    if (target.closest('#mobile-scrim')) document.body.classList.remove('sidebar-open');
  });

  document.getElementById('login-form').addEventListener('submit', submitLogin);
  document.getElementById('register-form').addEventListener('submit', submitRegister);
  document.getElementById('problem-form').addEventListener('submit', (event) => {
    event.preventDefault();
    createMaintenanceProblem(event.currentTarget);
  });
  const materialForm = document.getElementById('material-form');
  if (materialForm) materialForm.addEventListener('submit', (event) => {
    event.preventDefault();
    createMaterialLog(event.currentTarget);
  });
  document.getElementById('reporter-name').addEventListener('change', renderProblems);
  window.addEventListener('resize', drawPowerChart);
}

function renderInitial() {
  fillReportFormOptions();
  renderLegend();
  document.querySelectorAll('[data-speed]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.speed) === sim.tick_ms);
  });
  renderProblems();
  renderLive();
}

async function start() {
  setupEvents();
  updateAuthTab();
  updateUserChips();
  renderLegend();
  fillReportFormOptions();
  renderLive();
  // Try to restore an existing session before showing the app.
  if (authToken) {
    try {
      const me = await fetch('/api/auth/me', { headers: authHeaders() });
      if (me.ok) {
        const body = await me.json();
        if (body.user) {
          authUser = body.user;
          try { localStorage.setItem('wattwatch-user', JSON.stringify(authUser)); } catch { /* ignore */ }
          showApp();
        } else {
          throw new Error('invalid session');
        }
      } else {
        throw new Error('invalid session');
      }
    } catch {
      clearAuth();
      updateUserChips();
      showAuthScreen();
    }
  } else {
    showAuthScreen();
  }
  window.setInterval(() => { if (isAuthed()) refreshProblems({ quiet: true }); }, 15_000);
  window.setInterval(() => { if (isAuthed()) refreshMaterials({ quiet: true }); }, 20_000);
  window.setInterval(() => { if (isAuthed()) refreshWeather(); }, 600_000);
  window.setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock && clock.isConnected) clock.textContent = formatClock();
  }, 1000);
}

start();
