// Pomodoro Stats & Data Persistence Module

globalThis.pomoSecondsLeft = 25 * 60;
globalThis.pomoInitialSeconds = 25 * 60;
globalThis.pomoInterval = null;
globalThis.isPomoRunning = false;
globalThis.isPomoBreak = false;

// Persistent Stats & History
globalThis.pomoTotalFocusSecs = parseInt(localStorage.getItem('pomoTotalFocusSecs') || '0', 10);
globalThis.pomoTotalBreakSecs = parseInt(localStorage.getItem('pomoTotalBreakSecs') || '0', 10);
globalThis.pomoHistory = [];

try {
  globalThis.pomoHistory = JSON.parse(localStorage.getItem('pomoHistory') || '[]');
} catch (e) {
  globalThis.pomoHistory = [];
}

function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

globalThis.pomoTodayDate = localStorage.getItem('pomoTodayDate') || getTodayDateStr();
globalThis.pomoTodayFocusSecs = parseInt(localStorage.getItem('pomoTodayFocusSecs') || '0', 10);
globalThis.pomoTodayBreakSecs = parseInt(localStorage.getItem('pomoTodayBreakSecs') || '0', 10);

function checkTodayReset() {
  const currentToday = getTodayDateStr();
  if (pomoTodayDate !== currentToday) {
    pomoTodayDate = currentToday;
    pomoTodayFocusSecs = 0;
    pomoTodayBreakSecs = 0;
    localStorage.setItem('pomoTodayDate', pomoTodayDate);
    localStorage.setItem('pomoTodayFocusSecs', '0');
    localStorage.setItem('pomoTodayBreakSecs', '0');
  }
}

function recalculateTodayStats() {
  checkTodayReset();
  const todayStr = getTodayDateStr();
  let focusSecsFromHistory = 0;
  let breakSecsFromHistory = 0;
  let todaySessionsCount = 0;

  pomoHistory.forEach(item => {
    const dObj = getSessionDateObj(item);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    const keyStr = `${y}-${m}-${d}`;

    if (keyStr === todayStr) {
      todaySessionsCount++;
      if (item.type === 'Fokus') {
        focusSecsFromHistory += (item.durationMinutes || 0) * 60;
      } else {
        breakSecsFromHistory += (item.durationMinutes || 0) * 60;
      }
    }
  });

  if (focusSecsFromHistory > pomoTodayFocusSecs) {
    pomoTodayFocusSecs = focusSecsFromHistory;
  }
  if (breakSecsFromHistory > pomoTodayBreakSecs) {
    pomoTodayBreakSecs = breakSecsFromHistory;
  }

  return todaySessionsCount;
}

function savePomoStats() {
  localStorage.setItem('pomoTotalFocusSecs', pomoTotalFocusSecs.toString());
  localStorage.setItem('pomoTotalBreakSecs', pomoTotalBreakSecs.toString());
  localStorage.setItem('pomoTodayDate', pomoTodayDate);
  localStorage.setItem('pomoTodayFocusSecs', pomoTodayFocusSecs.toString());
  localStorage.setItem('pomoTodayBreakSecs', pomoTodayBreakSecs.toString());
  localStorage.setItem('pomoHistory', JSON.stringify(pomoHistory));

  // Save to SQLite database backend
  fetch('/api/pomo_stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      focusSecs: pomoTotalFocusSecs,
      breakSecs: pomoTotalBreakSecs,
      todayDate: pomoTodayDate,
      todayFocusSecs: pomoTodayFocusSecs,
      todayBreakSecs: pomoTodayBreakSecs,
      history: pomoHistory
    })
  }).catch(() => {});
}

function loadPomoStatsFromDB() {
  fetch('/api/pomo_stats')
    .then(r => r.json())
    .then(data => {
      if (data) {
        if (typeof data.focusSecs === 'number') pomoTotalFocusSecs = data.focusSecs;
        if (typeof data.breakSecs === 'number') pomoTotalBreakSecs = data.breakSecs;
        if (typeof data.todayDate === 'string') pomoTodayDate = data.todayDate;
        if (typeof data.todayFocusSecs === 'number') pomoTodayFocusSecs = data.todayFocusSecs;
        if (typeof data.todayBreakSecs === 'number') pomoTodayBreakSecs = data.todayBreakSecs;
        if (Array.isArray(data.history)) pomoHistory = data.history;

        recalculateTodayStats();
        if (typeof updatePomoStatsUI === 'function') updatePomoStatsUI();
      }
    })
    .catch(() => {});
}

function formatDurationText(totalSeconds) {
  if (totalSeconds <= 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m`;
  } else {
    return `${secs}d`;
  }
}

function recordCompletedSession(type, durationMins) {
  const now = new Date();
  const timestamp = now.getTime();
  const newSession = {
    id: 'pomo-' + timestamp,
    timestamp: timestamp,
    type: type, // 'Fokus' or 'Istirahat'
    durationMinutes: durationMins,
    completedAt: now.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    timeOnly: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  };
  pomoHistory.unshift(newSession);
  if (pomoHistory.length > 100) pomoHistory.pop(); // keep last 100
  savePomoStats();
}

function getSessionDateObj(item) {
  if (item.timestamp) return new Date(item.timestamp);
  if (item.id && typeof item.id === 'string' && item.id.startsWith('pomo-')) {
    const ts = parseInt(item.id.replace('pomo-', ''), 10);
    if (!isNaN(ts) && ts > 1000000000000) return new Date(ts);
  }
  if (item.completedAt) {
    const parts = item.completedAt.split(',');
    const dStr = parts[0] || item.completedAt;
    const dParts = dStr.trim().split('/');
    if (dParts.length === 3) {
      let year = dParts[2].trim();
      if (year.length === 2) year = '20' + year;
      const month = dParts[1].padStart(2, '0');
      const day = dParts[0].padStart(2, '0');
      const d = new Date(`${year}-${month}-${day}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

globalThis.getTodayDateStr = getTodayDateStr;
globalThis.checkTodayReset = checkTodayReset;
globalThis.recalculateTodayStats = recalculateTodayStats;
globalThis.savePomoStats = savePomoStats;
globalThis.loadPomoStatsFromDB = loadPomoStatsFromDB;
globalThis.formatDurationText = formatDurationText;
globalThis.recordCompletedSession = recordCompletedSession;
globalThis.getSessionDateObj = getSessionDateObj;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getTodayDateStr,
    checkTodayReset,
    recalculateTodayStats,
    savePomoStats,
    loadPomoStatsFromDB,
    formatDurationText,
    recordCompletedSession,
    getSessionDateObj,
    getPomoState: () => ({
      pomoSecondsLeft,
      pomoInitialSeconds,
      isPomoRunning,
      isPomoBreak,
      pomoTotalFocusSecs,
      pomoTotalBreakSecs,
      pomoTodayDate,
      pomoTodayFocusSecs,
      pomoTodayBreakSecs,
      pomoHistory
    }),
    setPomoState: (state) => {
      if ('pomoSecondsLeft' in state) pomoSecondsLeft = state.pomoSecondsLeft;
      if ('pomoInitialSeconds' in state) pomoInitialSeconds = state.pomoInitialSeconds;
      if ('isPomoRunning' in state) isPomoRunning = state.isPomoRunning;
      if ('isPomoBreak' in state) isPomoBreak = state.isPomoBreak;
      if ('pomoTotalFocusSecs' in state) pomoTotalFocusSecs = state.pomoTotalFocusSecs;
      if ('pomoTotalBreakSecs' in state) pomoTotalBreakSecs = state.pomoTotalBreakSecs;
      if ('pomoTodayDate' in state) pomoTodayDate = state.pomoTodayDate;
      if ('pomoTodayFocusSecs' in state) pomoTodayFocusSecs = state.pomoTodayFocusSecs;
      if ('pomoTodayBreakSecs' in state) pomoTodayBreakSecs = state.pomoTodayBreakSecs;
      if ('pomoHistory' in state) pomoHistory = state.pomoHistory;
    }
  };
}
