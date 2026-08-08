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

function savePomoStats() {
  localStorage.setItem('pomoTotalFocusSecs', pomoTotalFocusSecs.toString());
  localStorage.setItem('pomoTotalBreakSecs', pomoTotalBreakSecs.toString());
  localStorage.setItem('pomoHistory', JSON.stringify(pomoHistory));

  // Save to SQLite database backend
  fetch('/api/pomo_stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      focusSecs: pomoTotalFocusSecs,
      breakSecs: pomoTotalBreakSecs,
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
        if (Array.isArray(data.history)) pomoHistory = data.history;
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
  const elFocus = document.getElementById('totalFocusText');
  const elBreak = document.getElementById('totalBreakText');
  if (elFocus) elFocus.textContent = formatDurationText(pomoTotalFocusSecs);
  if (elBreak) elBreak.textContent = formatDurationText(pomoTotalBreakSecs);
}

function recordCompletedSession(type, durationMins) {
  const newSession = {
    id: 'pomo-' + Date.now(),
    type: type, // 'Fokus' or 'Istirahat'
    durationMinutes: durationMins,
    completedAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  };
  pomoHistory.unshift(newSession);
  if (pomoHistory.length > 50) pomoHistory.pop(); // keep last 50
  savePomoStats();
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
    isPomoRunning = true;
    btnPomoStart.innerHTML = '<i class="fa-solid fa-pause"></i>';
    btnPomoStart.title = 'Jeda';

    pomoInterval = setInterval(() => {
      if (pomoSecondsLeft > 0) {
        pomoSecondsLeft--;
        
        // Track accumulated seconds
        if (!isPomoBreak) {
          pomoTotalFocusSecs++;
        } else {
          pomoTotalBreakSecs++;
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
      <div style="text-align: center; color: #858585; padding: 20px 0; font-size: 0.82rem;">
        <i class="fa-solid fa-inbox" style="font-size: 1.5rem; margin-bottom: 6px; display: block;"></i>
        Belum ada riwayat sesi yang selesai. Mulai timer fokus untuk mencatat!
      </div>
    `;
    return;
  }

  let html = '';
  pomoHistory.forEach((item) => {
    const isFocus = item.type === 'Fokus';
    const icon = isFocus ? 'fa-fire' : 'fa-mug-hot';
    const color = isFocus ? '#e5c07b' : '#98c379';
    const bg = isFocus ? 'rgba(229, 192, 123, 0.15)' : 'rgba(152, 195, 121, 0.15)';

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #1e1e1e; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background: ${bg}; display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 0.85rem;">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #ffffff;">Sesi ${escapeHtml(item.type)} (${item.durationMinutes}m)</div>
            <div style="font-size: 0.72rem; color: #858585;">${escapeHtml(item.completedAt)}</div>
          </div>
        </div>
        <span style="font-size: 0.75rem; font-weight: 600; color: ${color}; background: ${bg}; padding: 2px 8px; border-radius: 10px;">
          Selesai ✅
        </span>
      </div>
    `;
  });

  historyList.innerHTML = html;
}

function showPomoAlertModal() {
  const pomoModal = document.getElementById('pomoAlertModal');
  const pomoMsg = document.getElementById('pomoAlertMessage');
  const btnContinue = document.getElementById('btnPomoContinue');
  const btnStop = document.getElementById('btnPomoStop');

  if (!pomoModal) return;

  if (!isPomoBreak) {
    pomoMsg.textContent = 'Kerja bagus! Sesi fokus Anda telah berakhir. Apakah Anda ingin langsung lanjut fokus lagi atau istirahat 5 menit?';
    btnContinue.textContent = 'Lanjut Fokus 🚀';
    btnStop.textContent = 'Istirahat 5 Menit ☕';
  } else {
    pomoMsg.textContent = 'Waktu istirahat selesai! Siap untuk kembali bekerja dan fokus?';
    btnContinue.textContent = 'Mulai Fokus Lagi 🚀';
    btnStop.textContent = 'Selesai / Nanti ☕';
  }

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
    pomoTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
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
    pomoTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

function playAlarmSound() {
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
    if (!ctx) return;

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
  } catch (e) {
    console.log('Audio playback error:', e);
  }
}
