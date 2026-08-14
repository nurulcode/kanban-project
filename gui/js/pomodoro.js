// Pomodoro Focus Timer Widget with Session History & Cumulative Stats

let pomoSecondsLeft = 25 * 60;
let pomoInitialSeconds = 25 * 60;
let pomoInterval = null;
let isPomoRunning = false;
let isPomoBreak = false;

// Persistent Stats & History
let pomoTotalFocusSecs = parseInt(localStorage.getItem('pomoTotalFocusSecs') || '0', 10);
let pomoTotalBreakSecs = parseInt(localStorage.getItem('pomoTotalBreakSecs') || '0', 10);
let pomoHistory = [];

try {
  pomoHistory = JSON.parse(localStorage.getItem('pomoHistory') || '[]');
} catch (e) {
  pomoHistory = [];
}

function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

let pomoTodayDate = localStorage.getItem('pomoTodayDate') || getTodayDateStr();
let pomoTodayFocusSecs = parseInt(localStorage.getItem('pomoTodayFocusSecs') || '0', 10);
let pomoTodayBreakSecs = parseInt(localStorage.getItem('pomoTodayBreakSecs') || '0', 10);

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

  pomoHistory.forEach(item => {
    const dObj = getSessionDateObj(item);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    const keyStr = `${y}-${m}-${d}`;

    if (keyStr === todayStr) {
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
        updatePomoStatsUI();
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

function updatePomoStatsUI() {
  recalculateTodayStats();

  const elFocus = document.getElementById('totalFocusText');
  const elBreak = document.getElementById('totalBreakText');
  if (elFocus) elFocus.textContent = formatDurationText(pomoTodayFocusSecs);
  if (elBreak) elBreak.textContent = formatDurationText(pomoTodayBreakSecs);

  const elModalFocus = document.getElementById('modalTotalFocusText');
  const elModalBreak = document.getElementById('modalTotalBreakText');
  if (elModalFocus) elModalFocus.textContent = formatDurationText(pomoTodayFocusSecs);
  if (elModalBreak) elModalBreak.textContent = formatDurationText(pomoTodayBreakSecs);
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

function formatDateGroupHeaderLabel(dateObj) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

  const dYear = dateObj.getFullYear();
  const dMonth = String(dateObj.getMonth()+1).padStart(2,'0');
  const dDay = String(dateObj.getDate()).padStart(2,'0');
  const keyStr = `${dYear}-${dMonth}-${dDay}`;

  const fullDateLabel = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (keyStr === todayStr) {
    return `📅 Hari Ini (${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  } else if (keyStr === yesterdayStr) {
    return `📅 Kemarin (${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  } else {
    return `📅 ${fullDateLabel}`;
  }
}

function renderPomoHistoryModal() {
  const elModalFocus = document.getElementById('modalTotalFocusText');
  const elModalBreak = document.getElementById('modalTotalBreakText');
  const elModalSessions = document.getElementById('modalTotalSessionsText');
  const historyList = document.getElementById('pomoHistoryList');

  if (elModalFocus) elModalFocus.textContent = formatDurationText(pomoTotalFocusSecs);
  if (elModalBreak) elModalBreak.textContent = formatDurationText(pomoTotalBreakSecs);
  if (elModalSessions) elModalSessions.textContent = pomoHistory.length.toString();

  if (!historyList) return;

  if (pomoHistory.length === 0) {
    historyList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 0.82rem;">
        <i class="fa-solid fa-inbox" style="font-size: 1.5rem; margin-bottom: 6px; display: block;"></i>
        Belum ada riwayat sesi yang selesai. Mulai timer fokus untuk mencatat!
      </div>
    `;
    return;
  }

  // Group items by date string key (YYYY-MM-DD)
  const groupsMap = new Map();

  pomoHistory.forEach((item) => {
    const dObj = getSessionDateObj(item);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, {
        dateObj: dObj,
        items: [],
        totalFocusMins: 0,
        totalBreakMins: 0
      });
    }
    const group = groupsMap.get(dateKey);
    group.items.push(item);
    if (item.type === 'Fokus') {
      group.totalFocusMins += (item.durationMinutes || 0);
    } else {
      group.totalBreakMins += (item.durationMinutes || 0);
    }
  });

  let html = '';
  // Sort date keys descending (most recent date first)
  const sortedKeys = Array.from(groupsMap.keys()).sort().reverse();

  sortedKeys.forEach((dateKey) => {
    const group = groupsMap.get(dateKey);
    const headerLabel = formatDateGroupHeaderLabel(group.dateObj);
    const focusText = group.totalFocusMins > 0 ? `🍅 ${group.totalFocusMins}m Fokus` : '';
    const breakText = group.totalBreakMins > 0 ? `☕ ${group.totalBreakMins}m Istirahat` : '';
    const summaryParts = [focusText, breakText].filter(Boolean).join(' • ');

    html += `
      <div class="pomo-date-group">
        <div class="pomo-date-header">
          <span>${escapeHtml(headerLabel)}</span>
          <span class="pomo-date-summary">${escapeHtml(summaryParts)}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
    `;

    group.items.forEach((item) => {
      const isFocus = item.type === 'Fokus';
      const icon = isFocus ? 'fa-fire' : 'fa-mug-hot';
      const iconClass = isFocus ? 'icon-focus' : 'icon-break';
      const badgeClass = isFocus ? 'badge-focus' : 'badge-break';
      const displayTime = item.timeOnly || item.completedAt || '';

      html += `
        <div class="pomo-history-item">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="pomo-item-icon ${iconClass}">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div>
              <div class="pomo-history-title">Sesi ${escapeHtml(item.type)} (${item.durationMinutes}m)</div>
              <div class="pomo-history-date">${escapeHtml(displayTime)}</div>
            </div>
          </div>
          <span class="pomo-history-badge ${badgeClass}">
            Selesai ✅
          </span>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  historyList.innerHTML = html;
}

function setupPomodoro() {
  const pomoTimerDisplay = document.getElementById('pomoTimer');
  const btnPomoStart = document.getElementById('btnPomoStart');
  const btnPomoReset = document.getElementById('btnPomoReset');
  const btnPomoMode = document.getElementById('btnPomoMode');
  const selectPomoDuration = document.getElementById('pomoDurationSelect');
  const pomoBadge = document.getElementById('pomoBadge');
  const btnPomoHistory = document.getElementById('btnPomoHistory');
  const btnShowPomoHistory = document.getElementById('btnShowPomoHistory');
  const btnShowBreakHistory = document.getElementById('btnShowBreakHistory');

  if (!pomoTimerDisplay || !btnPomoStart) return;

  loadPomoStatsFromDB();
  updatePomoStatsUI();

  function updateDisplay() {
    const mins = Math.floor(pomoSecondsLeft / 60);
    const secs = pomoSecondsLeft % 60;
    pomoTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer() {
    if (isPomoRunning) return;
    requestNotificationPermission();
    isPomoRunning = true;
    btnPomoStart.innerHTML = '<i class="fa-solid fa-pause"></i>';
    btnPomoStart.title = 'Jeda';

    pomoInterval = setInterval(() => {
      if (pomoSecondsLeft > 0) {
        pomoSecondsLeft--;
        
        // Track accumulated seconds
        checkTodayReset();
        if (!isPomoBreak) {
          pomoTotalFocusSecs++;
          pomoTodayFocusSecs++;
        } else {
          pomoTotalBreakSecs++;
          pomoTodayBreakSecs++;
        }
        
        // Save stats periodically
        if (pomoSecondsLeft % 5 === 0) {
          savePomoStats();
          updatePomoStatsUI();
        }
        
        updateDisplay();
      } else {
        clearInterval(pomoInterval);
        isPomoRunning = false;
        btnPomoStart.innerHTML = '<i class="fa-solid fa-play"></i>';
        btnPomoStart.title = 'Mulai';

        // Record completed session
        const durationMins = Math.max(1, Math.round(pomoInitialSeconds / 60));
        recordCompletedSession(isPomoBreak ? 'Istirahat' : 'Fokus', durationMins);
        savePomoStats();
        updatePomoStatsUI();

        playAlarmSound();
        showPomoAlertModal();
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(pomoInterval);
    isPomoRunning = false;
    btnPomoStart.innerHTML = '<i class="fa-solid fa-play"></i>';
    btnPomoStart.title = 'Mulai';
    savePomoStats();
    updatePomoStatsUI();
  }

  function resetTimer() {
    pauseTimer();
    const chosenMinutes = parseInt(selectPomoDuration ? selectPomoDuration.value : 25, 10) || 25;
    pomoInitialSeconds = isPomoBreak ? 5 * 60 : chosenMinutes * 60;
    pomoSecondsLeft = pomoInitialSeconds;
    updateDisplay();
  }

  function switchMode() {
    pauseTimer();
    isPomoBreak = !isPomoBreak;
    if (isPomoBreak) {
      if (pomoBadge) {
        pomoBadge.textContent = '☕ Istirahat';
        pomoBadge.classList.add('break-mode');
      }
      pomoInitialSeconds = 5 * 60;
      pomoSecondsLeft = pomoInitialSeconds;
    } else {
      if (pomoBadge) {
        pomoBadge.textContent = '🍅 Fokus';
        pomoBadge.classList.remove('break-mode');
      }
      const chosenMinutes = parseInt(selectPomoDuration ? selectPomoDuration.value : 25, 10) || 25;
      pomoInitialSeconds = chosenMinutes * 60;
      pomoSecondsLeft = pomoInitialSeconds;
    }
    updateDisplay();
  }

  if (selectPomoDuration) {
    selectPomoDuration.addEventListener('change', () => {
      if (!isPomoBreak) {
        const chosenMinutes = parseInt(selectPomoDuration.value, 10) || 25;
        pomoInitialSeconds = chosenMinutes * 60;
        pomoSecondsLeft = pomoInitialSeconds;
        updateDisplay();
      }
    });
  }

  btnPomoStart.addEventListener('click', () => {
    if (isPomoRunning) pauseTimer();
    else startTimer();
  });

  if (btnPomoReset) btnPomoReset.addEventListener('click', resetTimer);
  if (btnPomoMode) btnPomoMode.addEventListener('click', switchMode);

  if (btnPomoHistory) btnPomoHistory.addEventListener('click', openPomoHistoryModal);
  if (btnShowPomoHistory) btnShowPomoHistory.addEventListener('click', openPomoHistoryModal);
  if (btnShowBreakHistory) btnShowBreakHistory.addEventListener('click', openPomoHistoryModal);

  setupPomoHistoryModal();
  updateDisplay();
}

function setupPomoHistoryModal() {
  const modal = document.getElementById('pomoHistoryModal');
  const btnCloseX = document.getElementById('btnClosePomoHistoryModal');
  const btnClose = document.getElementById('btnClosePomoHistory');
  const btnClear = document.getElementById('btnClearPomoHistory');
  const btnTestAlarm = document.getElementById('btnTestAlarmSound');

  if (!modal) return;

  const closeModal = () => modal.classList.remove('active');

  if (btnCloseX) btnCloseX.addEventListener('click', closeModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);

  if (btnTestAlarm) {
    btnTestAlarm.addEventListener('click', () => {
      playAlarmSound();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin mereset statistik dan riwayat waktu fokus?')) {
        pomoTotalFocusSecs = 0;
        pomoTotalBreakSecs = 0;
        pomoHistory = [];
        savePomoStats();
        updatePomoStatsUI();
        renderPomoHistoryModal();
      }
    });
  }
}

function openPomoHistoryModal() {
  const modal = document.getElementById('pomoHistoryModal');
  if (!modal) return;

  renderPomoHistoryModal();
  modal.classList.add('active');
}

// Request Desktop Notification Permission
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showDesktopNotification(title, body) {
  // 1. Send native OS notification request via Python backend (notify-send)
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title, body: body })
  }).catch(() => {});

  // 2. Web Notification API (Browser standard)
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: 'favicon.ico',
          requireInteraction: true
        });

        notification.onclick = function() {
          window.focus();
          notification.close();
        };
      } catch (e) {
        console.log('Desktop Notification Error:', e);
      }
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          try {
            new Notification(title, { body: body, icon: 'favicon.ico' });
          } catch(e) {}
        }
      });
    }
  }
}

function showPomoAlertModal() {
  const pomoModal = document.getElementById('pomoAlertModal');
  const pomoTitle = document.getElementById('pomoAlertTitle');
  const pomoMsg = document.getElementById('pomoAlertMessage');
  const btnContinue = document.getElementById('btnPomoContinue');
  const btnStop = document.getElementById('btnPomoStop');

  if (!pomoModal) return;

  let titleText = '';
  let msgText = '';

  if (!isPomoBreak) {
    titleText = '⏰ Waktu Fokus Selesai!';
    msgText = 'Kerja bagus! Sesi fokus Anda telah berakhir. Apakah Anda ingin langsung lanjut fokus lagi atau istirahat 5 menit?';
    if (pomoTitle) pomoTitle.innerHTML = titleText;
    if (pomoMsg) pomoMsg.textContent = msgText;
    if (btnContinue) btnContinue.textContent = 'Lanjut Fokus Lagi 🚀';
    if (btnStop) btnStop.textContent = 'Istirahat 5 Menit ☕';
  } else {
    titleText = '☕ Waktu Istirahat Selesai!';
    msgText = 'Waktu istirahat selesai! Siap untuk kembali bekerja dan fokus?';
    if (pomoTitle) pomoTitle.innerHTML = titleText;
    if (pomoMsg) pomoMsg.textContent = msgText;
    if (btnContinue) btnContinue.textContent = 'Mulai Fokus Lagi 🚀';
    if (btnStop) btnStop.textContent = 'Selesai / Nanti ☕';
  }

  // Bring app window to front so user sees the pop-up modal immediately
  fetch('/api/focus_window', { method: 'POST' }).catch(() => {});
  try { window.focus(); } catch (e) {}

  // Trigger System Desktop Notification (bisa tampil di atas Chrome / App lain)
  showDesktopNotification(titleText, msgText);

  pomoModal.classList.add('active');

  btnContinue.onclick = () => {
    pomoModal.classList.remove('active');
    isPomoBreak = false;
    const selectPomoDuration = document.getElementById('pomoDurationSelect');
    const chosenMinutes = parseInt(selectPomoDuration ? selectPomoDuration.value : 25, 10) || 25;
    const pomoBadge = document.getElementById('pomoBadge');
    if (pomoBadge) {
      pomoBadge.textContent = '🍅 Fokus';
      pomoBadge.classList.remove('break-mode');
    }
    pomoSecondsLeft = chosenMinutes * 60;
    pomoInitialSeconds = pomoSecondsLeft;
    const pomoTimerDisplay = document.getElementById('pomoTimer');
    const mins = Math.floor(pomoSecondsLeft / 60);
    const secs = pomoSecondsLeft % 60;
    if (pomoTimerDisplay) {
      pomoTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    // Start automatically
    const btnPomoStart = document.getElementById('btnPomoStart');
    if (btnPomoStart) btnPomoStart.click();
  };

  btnStop.onclick = () => {
    pomoModal.classList.remove('active');
    const pomoBadge = document.getElementById('pomoBadge');
    if (!isPomoBreak) {
      isPomoBreak = true;
      if (pomoBadge) {
        pomoBadge.textContent = '☕ Istirahat';
        pomoBadge.classList.add('break-mode');
      }
      pomoInitialSeconds = 5 * 60;
      pomoSecondsLeft = pomoInitialSeconds;
    } else {
      isPomoBreak = false;
      if (pomoBadge) {
        pomoBadge.textContent = '🍅 Fokus';
        pomoBadge.classList.remove('break-mode');
      }
      const selectPomoDuration = document.getElementById('pomoDurationSelect');
      const chosenMinutes = parseInt(selectPomoDuration ? selectPomoDuration.value : 25, 10) || 25;
      pomoInitialSeconds = chosenMinutes * 60;
      pomoSecondsLeft = pomoInitialSeconds;
    }
    const pomoTimerDisplay = document.getElementById('pomoTimer');
    const mins = Math.floor(pomoSecondsLeft / 60);
    const secs = pomoSecondsLeft % 60;
    if (pomoTimerDisplay) {
      pomoTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  };
}

// Audio Alarm (Web Audio API with Autoplay Unlock)
let globalAudioCtx = null;

function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

// Unlock AudioContext on first user interaction anywhere in the window
document.addEventListener('click', () => {
  getAudioContext();
}, { passive: true });

function playAlarmSound(repeatCount = 3) {
  let playedCount = 0;

  function playOnce() {
    // 1. Native Linux PulseAudio sound via Python backend
    fetch('/api/play_sound', { method: 'POST' }).catch(() => {});

    // 2. HTML5 Audio Element (plays alarm.wav)
    try {
      const audio = new Audio('alarm.wav');
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}

    // 3. Web Audio API synthesizer
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;
        // Multi-chime melody: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.18);

          gain.gain.setValueAtTime(0.7, now + i * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.38);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.18);
          osc.stop(now + i * 0.18 + 0.4);
        });
      }
    } catch (e) {
      console.log('Audio playback error:', e);
    }

    playedCount++;
    if (playedCount < repeatCount) {
      setTimeout(playOnce, 2500);
    }
  }

  playOnce();
}
