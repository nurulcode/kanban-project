// Pomodoro UI & History Modal View Module

if (typeof escapeHtml !== 'function') {
  globalThis.escapeHtml = function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
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

function updatePomoStatsUI() {
  const todaySessionsCount = recalculateTodayStats();

  const elFocus = document.getElementById('totalFocusText');
  const elBreak = document.getElementById('totalBreakText');
  if (elFocus) elFocus.textContent = formatDurationText(pomoTodayFocusSecs);
  if (elBreak) elBreak.textContent = formatDurationText(pomoTodayBreakSecs);

  const elModalFocus = document.getElementById('modalTotalFocusText');
  const elModalBreak = document.getElementById('modalTotalBreakText');
  const elModalSessions = document.getElementById('modalTotalSessionsText');
  if (elModalFocus) elModalFocus.textContent = formatDurationText(pomoTodayFocusSecs);
  if (elModalBreak) elModalBreak.textContent = formatDurationText(pomoTodayBreakSecs);
  if (elModalSessions) elModalSessions.textContent = todaySessionsCount.toString();
}

function renderPomoHistoryModal() {
  updatePomoStatsUI();

  const historyList = document.getElementById('pomoHistoryList');
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
      if (typeof playAlarmSound === 'function') playAlarmSound();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin mereset statistik dan riwayat waktu fokus?')) {
        pomoTotalFocusSecs = 0;
        pomoTotalBreakSecs = 0;
        pomoTodayFocusSecs = 0;
        pomoTodayBreakSecs = 0;
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

globalThis.formatDateGroupHeaderLabel = formatDateGroupHeaderLabel;
globalThis.updatePomoStatsUI = updatePomoStatsUI;
globalThis.renderPomoHistoryModal = renderPomoHistoryModal;
globalThis.setupPomoHistoryModal = setupPomoHistoryModal;
globalThis.openPomoHistoryModal = openPomoHistoryModal;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatDateGroupHeaderLabel,
    updatePomoStatsUI,
    renderPomoHistoryModal,
    setupPomoHistoryModal,
    openPomoHistoryModal
  };
}
