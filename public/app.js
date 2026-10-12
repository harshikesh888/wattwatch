'use strict';

const RATE_PER_KWH = 8;
const CO2_PER_KWH = 0.82;
const STANDBY_KW = 0.02;
const WASTE_THRESHOLD_KW = 0.2;
const ROOM_COLORS = ['#10a875', '#e58a34', '#5387c1', '#d75060', '#8c68bd', '#29a5a5', '#b77b32', '#7785a2'];
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

const PAGE_INFO = {
  dashboard: ['Energy Waste Overview', 'Detecting empty rooms where lights, AC or projectors were left running.'],
  alerts: ['Urgent Problems', 'Active energy waste ranked by what needs attention first.'],
  rooms: ['Campus Rooms', 'Toggle occupancy and appliances to simulate live campus conditions.'],
  impact: ['Savings & Impact', 'Money, carbon and the room efficiency leaderboard.'],
  reports: ['Room Problem Reports', 'Raise an equipment fault and track it until it is fixed.'],
};

let sim = loadSimulation();
let problems = [];
let currentView = 'dashboard';
let reportFilter = 'all';
let tickTimer = null;
let tickInProgress = false;
let toastTimer = null;
let backendOnline = false;
const energyCreateRetryAfter = {};

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function buildInitialSimulation(saved = null, legacy = null) {
  const legacyLive = legacy && legacy.live && typeof legacy.live === 'object' ? legacy.live : {};
  const oldAlerts = legacy && Array.isArray(legacy.alerts) ? legacy.alerts : [];
  const rooms = {};
  const readings = {};
  const wasteByRoom = {};
  for (const room of ROOMS) {
    const previous = (saved && saved.rooms && saved.rooms[room.id])
      || (saved && saved.live && saved.live[room.id])
      || legacyLive[room.id];
    const occupied = typeof previous?.occupied === 'boolean' ? previous.occupied : (SEED_OCCUPIED[room.id] ?? true);
    const appliancesOn = Array.isArray(previous?.appliancesOn)
      ? [...previous.appliancesOn]
      : [...(SEED_APPLIANCES[room.id] || ['lights'])];
    rooms[room.id] = {
      occupied,
      appliancesOn,
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
    readings[room.id] = Array.isArray(saved?.readings?.[room.id])
      ? saved.readings[room.id].slice(-50)
      : [];
  }
  const oldWaste = oldAlerts.reduce((sum, alert) => sum + (Number(alert.wasted_kWh) || 0), 0);
  return {
    rooms,
    readings,
    streaks: saved?.streaks || {},
    wasteByRoom,
    total_wasted_kwh: Number.isFinite(saved?.total_wasted_kwh) ? saved.total_wasted_kwh : oldWaste,
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
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).join(', ')
      : body.detail;
    throw new Error(detail || `Request failed (${response.status})`);
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
  try {
    const result = await apiRequest('/api/problems');
    problems = Array.isArray(result.items) ? result.items : [];
    setBackendStatus(true);
    renderProblems();
    renderLive();
    return true;
  } catch (error) {
    setBackendStatus(false);
    if (!quiet) showToast(`Backend unavailable: ${error.message}`, 'error');
    return false;
  }
}

function byKind(kind) {
  return problems.filter((problem) => problem.kind === kind);
}

function activeEnergyProblems() {
  return byKind('energy_waste');
}

function maintenanceProblems() {
  return byKind('maintenance');
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

function totalEnergyToday() {
  return ROOMS.reduce((sum, room) => sum + (sim.rooms[room.id]?.today_kwh || 0), 0);
}

function co2For(kwh) {
  return kwh * CO2_PER_KWH;
}

function updateHeader() {
  const [title, subtitle] = PAGE_INFO[currentView] || PAGE_INFO.dashboard;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  const activeCount = activeEnergyProblems().length;
  const status = document.getElementById('header-status');
  status.textContent = activeCount ? `${activeCount} wasting` : 'All clean';
  status.className = `status-pill ${activeCount ? 'wasting' : 'clean'}`;
  document.getElementById('top-live-load').textContent = `${currentPowerTotal().toFixed(2)} kW`;
  document.getElementById('clock').textContent = formatClock();
  const alertBadge = document.getElementById('nav-alert-count');
  alertBadge.textContent = activeCount ? String(activeCount) : '';
  const reportCount = maintenanceProblems().length;
  const reportBadge = document.getElementById('nav-report-count');
  reportBadge.textContent = reportCount ? String(reportCount) : '';
}

function updateKpis() {
  const live = currentPowerTotal();
  const used = totalEnergyToday();
  const wasted = sim.total_wasted_kwh;
  const co2 = co2For(wasted);
  document.getElementById('kpi-live').textContent = `${live.toFixed(2)} kW`;
  document.getElementById('kpi-tick').textContent = `Reading #${sim.tick} · refreshes every ${sim.tick_ms / 1000}s`;
  document.getElementById('kpi-used').textContent = `${used.toFixed(2)} kWh`;
  document.getElementById('kpi-wasted').textContent = `₹${(wasted * RATE_PER_KWH).toFixed(2)}`;
  document.getElementById('kpi-wasted-note').textContent = `${wasted.toFixed(3)} kWh wasted at ₹8/unit`;
  document.getElementById('kpi-co2').textContent = `${co2.toFixed(2)} kg`;
  document.getElementById('kpi-co2-note').textContent = `≈${(co2 / 21).toFixed(2)} trees · ${Math.round(wasted * 80)} phone charges`;
}

function urgencyScore(problem) {
  const ageMs = Math.max(0, Date.now() - Date.parse(problem.created_at));
  return Number(problem.power_kw || 0) * 100
    + Math.min(ageMs / 60_000, 120) * 1.5
    + Number(problem.wasted_kwh || 0) * 500;
}

function urgencyLevel(problem) {
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
  document.getElementById('dashboard-urgent-list').innerHTML = urgentMarkup;
  document.getElementById('alerts-list').innerHTML = urgentMarkup;
  document.getElementById('dashboard-alert-count').textContent = String(urgent.length);
  document.getElementById('alerts-count').textContent = String(urgent.length);

  const reports = maintenanceProblems().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const reporterName = document.getElementById('reporter-name')?.value.trim().toLowerCase() || '';
  const visible = reportFilter === 'mine'
    ? reports.filter((problem) => problem.reporter_name.toLowerCase() === reporterName)
    : reports;
  document.getElementById('maintenance-list').innerHTML = visible.length
    ? visible.map(maintenanceProblemMarkup).join('')
    : emptyMarkup('No reports here', reportFilter === 'mine' ? 'No open reports match this reporter name.' : 'No open reports yet. Raise the first one here.');
  document.getElementById('reports-count').textContent = String(reports.length);

  updateHeader();
}

function roomStatus(room) {
  if (activeEnergyProblems().some((problem) => problem.room_id === room.id)) return 'wasting';
  return sim.rooms[room.id]?.occupied ? 'occupied' : 'empty';
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
  const color = roomStatus(ROOMS.find((room) => room.id === roomId)) === 'wasting' ? '#d94d5c' : '#11956d';
  return `<svg class="sparkline" viewBox="0 0 240 46" role="img" aria-label="Recent power readings"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
      ${compact ? '' : `<div class="appliance-heading">Appliances · tap to switch</div><div class="appliance-grid">${applianceButtons}</div>`}
    </article>`;
}

function renderRooms() {
  document.getElementById('dashboard-room-grid').innerHTML = ROOMS.map((room) => roomCardMarkup(room, true)).join('');
  document.getElementById('rooms-page-grid').innerHTML = ROOMS.map((room) => roomCardMarkup(room, false)).join('');
  document.getElementById('rooms-count').textContent = String(ROOMS.length);
}

function renderImpact() {
  const wasted = sim.total_wasted_kwh;
  const rupees = wasted * RATE_PER_KWH;
  const co2 = co2For(wasted);
  const trees = co2 / 21;
  const phones = wasted * 80;
  document.getElementById('impact-energy').textContent = `${wasted.toFixed(2)} kWh`;
  document.getElementById('impact-phones').textContent = `≈ ${Math.round(phones)} phone charges`;
  document.getElementById('impact-cost').textContent = `₹${rupees.toFixed(2)}`;
  document.getElementById('impact-co2').textContent = `${co2.toFixed(2)} kg`;
  document.getElementById('impact-trees').textContent = trees.toFixed(2);

  const rows = ROOMS.map((room) => ({
    ...room,
    wasted: Number(sim.wasteByRoom[room.id] || 0),
    score: Math.max(0, Math.round(100 - Number(sim.wasteByRoom[room.id] || 0) * 10)),
  })).sort((a, b) => a.wasted - b.wasted);
  document.getElementById('efficiency-rows').innerHTML = rows.map((room, index) => `
    <tr><td><span class="table-rank">${index + 1}</span></td><td><strong>${escapeHtml(room.name)}</strong></td>
    <td class="numeric">${room.wasted.toFixed(4)} kWh</td>
    <td class="numeric"><span class="score-track"><span class="score-fill" style="width:${room.score}%"></span></span>${room.score}</td></tr>`).join('');

  const worst = [...rows].sort((a, b) => b.wasted - a.wasted)[0];
  const projection = document.getElementById('projection');
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

function renderLive() {
  updateKpis();
  updateHeader();
  renderRooms();
  renderImpact();
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
    context.strokeStyle = '#edf1ef';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();
    context.fillStyle = '#9aa6a1';
    context.fillText(`${(maxPower * (1 - tick / 4)).toFixed(1)}`, left - 7, y);
  }
  ROOMS.forEach((room, roomIndex) => {
    const values = (sim.readings[room.id] || []).slice(-50);
    if (values.length < 2) return;
    context.strokeStyle = ROOM_COLORS[roomIndex];
    context.lineWidth = roomIndex === 0 ? 2 : 1.5;
    context.globalAlpha = 0.86;
    context.beginPath();
    values.forEach((reading, index) => {
      const x = left + (index / Math.max(1, values.length - 1)) * plotWidth;
      const y = top + (1 - Math.min(maxPower, reading.power_kw) / maxPower) * plotHeight;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  });
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
  if (viewName === 'impact') renderImpact();
  if (viewName === 'rooms') renderRooms();
  if (viewName === 'alerts' || viewName === 'reports') renderProblems();
  drawPowerChart();
  document.body.classList.remove('sidebar-open');
}

function fillReportFormOptions() {
  document.getElementById('report-room').innerHTML = ROOMS.map((room) =>
    `<option value="${room.id}">${escapeHtml(room.name)} — ${escapeHtml(room.type)}</option>`,
  ).join('');
  document.getElementById('report-category').innerHTML = REPORT_CATEGORIES.map((category) =>
    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
  ).join('');
  const savedReporter = localStorage.getItem('wattwatch-reporter-name');
  if (savedReporter) document.getElementById('reporter-name').value = savedReporter;
}

async function createMaintenanceProblem(form) {
  const values = new FormData(form);
  const reporterName = String(values.get('reporter_name') || '').trim();
  const roomId = String(values.get('room_id') || '');
  const room = ROOMS.find((item) => item.id === roomId);
  const description = String(values.get('description') || '').trim();
  if (!room || reporterName.length < 2 || description.length < 5) {
    showToast('Enter your name and describe the problem in at least five characters.', 'error');
    return;
  }
  try {
    await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'maintenance',
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

async function createEnergyProblem(room, power) {
  try {
    const response = await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'energy_waste',
        room_id: room.id,
        room_name: room.name,
        category: 'Power wastage',
        description: 'Empty room with equipment still running.',
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
  saveSimulation();
  renderLive();
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
  if (!window.confirm('Reset the simulator day? This clears room readings, energy totals and active waste alerts. Maintenance reports are kept.')) return;
  const currentWaste = activeEnergyProblems();
  await Promise.allSettled(currentWaste.map((problem) => removeProblem(problem.id)));
  const fresh = buildInitialSimulation();
  sim = fresh;
  saveSimulation();
  renderProblems();
  renderLive();
  showToast('Fresh simulator day started. Maintenance reports were kept.');
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

async function simulatorTick() {
  if (tickInProgress) return;
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
  if (action === 'resolve-energy') resolveEnergyProblem(id);
  if (action === 'resolve-report') resolveMaintenanceProblem(id);
  if (action === 'start-work') startMaintenanceWork(id);
}

function setupEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
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
    const speedButton = target.closest('[data-speed]');
    if (speedButton) {
      setSimulationSpeed(Number(speedButton.dataset.speed));
      return;
    }
    if (target.closest('#demo-waste')) triggerDemoWaste();
    if (target.closest('#empty-all')) emptyAllRooms();
    if (target.closest('#fill-all')) fillAllRooms();
    if (target.closest('#reset-day')) resetSimulationDay();
    if (target.closest('#mobile-menu')) document.body.classList.add('sidebar-open');
    if (target.closest('#mobile-scrim')) document.body.classList.remove('sidebar-open');
  });

  document.getElementById('problem-form').addEventListener('submit', (event) => {
    event.preventDefault();
    createMaintenanceProblem(event.currentTarget);
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
  renderInitial();
  await refreshProblems();
  restartTickTimer();
  window.setInterval(() => refreshProblems({ quiet: true }), 15_000);
  window.setInterval(() => {
    document.getElementById('clock').textContent = formatClock();
  }, 1000);
}

start();
