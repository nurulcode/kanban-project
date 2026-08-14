// Pomodoro Timer Core Countdown & Alert Modal Controller

function showPomoAlertModal(mode, minutes, title, message) {
  const modal = document.getElementById('pomoAlertModal');
  if (!modal) return;

  const alertTitle = document.getElementById('pomoAlertTitle');
  const alertMsg = document.getElementById('pomoAlertMsg');
  const btnAction = document.getElementById('btnPomoAlertAction');

  if (alertTitle) alertTitle.textContent = title;
  if (alertMsg) alertMsg.textContent = message;

  if (btnAction) {
    if (mode === 'break') {
      btnAction.className = 'btn btn-primary';
      btnAction.innerHTML = `<i class="fa-solid fa-mug-hot"></i> Mulai Istirahat (${minutes}m)`;
    } else {
      btnAction.className = 'btn btn-primary';
      btnAction.innerHTML = `<i class="fa-solid fa-fire"></i> Kembali Fokus (${minutes}m)`;
    }

    btnAction.onclick = () => {
      modal.classList.remove('active');
      const pomoCustomInput = document.getElementById('pomoCustomDuration');
      if (pomoCustomInput) pomoCustomInput.value = minutes.toString();

      pomoInitialSeconds = minutes * 60;
      pomoSecondsLeft = pomoInitialSeconds;
      isPomoBreak = (mode === 'break');

      const pomoTimer = document.getElementById('pomoTimer');
      const btnToggle = document.getElementById('btnTogglePomo');
      const badge = document.getElementById('pomoBadge');

      if (badge) {
        badge.textContent = isPomoBreak ? 'Istirahat' : 'Fokus';
        badge.style.background = isPomoBreak ? 'rgba(152, 195, 121, 0.2)' : 'rgba(206, 145, 120, 0.2)';
        badge.style.color = isPomoBreak ? '#98c379' : '#ce9178';
      }

      if (pomoTimer) {
        const m = Math.floor(pomoSecondsLeft / 60);
        const s = pomoSecondsLeft % 60;
        pomoTimer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      // Auto start next session
      if (btnToggle && !isPomoRunning) {
        btnToggle.click();
      }
    };
  }

  modal.classList.add('active');
}

function setupPomodoro() {
  const pomoTimer = document.getElementById('pomoTimer');
  const btnToggle = document.getElementById('btnTogglePomo');
  const btnReset = document.getElementById('btnResetPomo');
  const pomoCustomInput = document.getElementById('pomoCustomDuration');
  const badge = document.getElementById('pomoBadge');
  const pomoHistoryPill = document.getElementById('pomoHistoryPill');

  if (!pomoTimer) return;

  requestNotificationPermission();
  loadPomoStatsFromDB();
  recalculateTodayStats();
  updatePomoStatsUI();
  setupPomoHistoryModal();

  if (pomoHistoryPill) {
    pomoHistoryPill.addEventListener('click', openPomoHistoryModal);
  }

  function updateDisplay() {
    const mins = Math.floor(pomoSecondsLeft / 60);
    const secs = pomoSecondsLeft % 60;
    pomoTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  if (pomoCustomInput) {
    pomoCustomInput.addEventListener('change', () => {
      if (!isPomoRunning) {
        let val = parseInt(pomoCustomInput.value, 10);
        if (isNaN(val) || val < 1) val = 25;
        if (val > 120) val = 120;
        pomoCustomInput.value = val;

        pomoInitialSeconds = val * 60;
        pomoSecondsLeft = pomoInitialSeconds;
        updateDisplay();
      }
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      if (isPomoRunning) {
        // Pause
        clearInterval(pomoInterval);
        isPomoRunning = false;
        btnToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
      } else {
        // Start
        getAudioContext();
        isPomoRunning = true;
        btnToggle.innerHTML = '<i class="fa-solid fa-pause"></i>';

        pomoInterval = setInterval(() => {
          if (pomoSecondsLeft > 0) {
            pomoSecondsLeft--;
            updateDisplay();

            // Track daily total focus & break seconds
            checkTodayReset();
            if (isPomoBreak) {
              pomoTotalBreakSecs++;
              pomoTodayBreakSecs++;
            } else {
              pomoTotalFocusSecs++;
              pomoTodayFocusSecs++;
            }

            // Save stats periodically every 15 seconds
            if (pomoSecondsLeft % 15 === 0) {
              savePomoStats();
              updatePomoStatsUI();
            }
          } else {
            // Timer finished
            clearInterval(pomoInterval);
            isPomoRunning = false;
            btnToggle.innerHTML = '<i class="fa-solid fa-play"></i>';

            const sessionMins = Math.round(pomoInitialSeconds / 60);
            const currentMode = isPomoBreak ? 'Istirahat' : 'Fokus';

            recordCompletedSession(currentMode, sessionMins);
            savePomoStats();
            updatePomoStatsUI();

            playAlarmSound(3);

            if (!isPomoBreak) {
              // Focus ended -> Time for Break
              showDesktopNotification(
                '🎉 Sesi Fokus Selesai!',
                `Hebat! Anda telah menyelesaikan ${sessionMins} menit fokus. Waktunya istirahat sejenak ☕`
              );
              showPomoAlertModal('break', 5, '🎉 Waktunya Istirahat!', `Selamat! Anda telah menyelesaikan sesi fokus ${sessionMins} menit. Ambil napas dan nikmati istirahat 5 menit.`);
            } else {
              // Break ended -> Time to Focus
              showDesktopNotification(
                '☕ Waktu Istirahat Selesai!',
                `Waktu istirahat ${sessionMins} menit telah habis. Siap untuk fokus kembali? 🔥`
              );
              showPomoAlertModal('focus', 25, '🔥 Siap Fokus Kembali?', `Waktu istirahat ${sessionMins} menit telah selesai. Mari lanjutkan pekerjaan dengan sesi fokus 25 menit!`);
            }
          }
        }, 1000);
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      clearInterval(pomoInterval);
      isPomoRunning = false;
      isPomoBreak = false;
      if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-play"></i>';

      if (badge) {
        badge.textContent = 'Fokus';
        badge.style.background = 'rgba(206, 145, 120, 0.2)';
        badge.style.color = '#ce9178';
      }

      let val = parseInt(pomoCustomInput ? pomoCustomInput.value : '25', 10);
      if (isNaN(val) || val < 1) val = 25;

      pomoInitialSeconds = val * 60;
      pomoSecondsLeft = pomoInitialSeconds;
      updateDisplay();
    });
  }

  updateDisplay();
}

globalThis.showPomoAlertModal = showPomoAlertModal;
globalThis.setupPomodoro = setupPomodoro;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showPomoAlertModal,
    setupPomodoro
  };
}
