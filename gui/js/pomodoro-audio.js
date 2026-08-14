// Pomodoro Desktop Notifications & Audio Alarm Module

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
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', () => {
    getAudioContext();
  }, { passive: true });
}

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

globalThis.requestNotificationPermission = requestNotificationPermission;
globalThis.showDesktopNotification = showDesktopNotification;
globalThis.getAudioContext = getAudioContext;
globalThis.playAlarmSound = playAlarmSound;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    requestNotificationPermission,
    showDesktopNotification,
    getAudioContext,
    playAlarmSound
  };
}
