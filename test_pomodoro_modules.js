const test = require('node:test');
const assert = require('node:assert');

// Setup mock browser environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class ElementMock {
  constructor(id) {
    this.id = id;
    this.textContent = '';
    this.innerHTML = '';
    this.value = '25';
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    };
    this.style = {};
  }
  addEventListener() {}
}

const elementsMap = {};
function getElementMock(id) {
  if (!elementsMap[id]) {
    elementsMap[id] = new ElementMock(id);
  }
  return elementsMap[id];
}

global.window = global;
global.localStorage = new LocalStorageMock();
global.document = {
  getElementById: (id) => getElementMock(id),
  addEventListener: () => {}
};
global.fetch = async () => ({
  json: async () => ({})
});
global.Notification = {
  permission: 'granted',
  requestPermission: async () => 'granted'
};

const stats = require('./gui/js/pomodoro-stats.js');
const audio = require('./gui/js/pomodoro-audio.js');
const ui = require('./gui/js/pomodoro-ui.js');
const timer = require('./gui/js/pomodoro-timer.js');

test('Modular Pomodoro Tests', async (t) => {

  await t.test('[pomodoro-stats] formatDurationText & date calculation', () => {
    assert.strictEqual(stats.formatDurationText(120), '2m');
    assert.strictEqual(stats.formatDurationText(3600), '1j 0m');
    assert.match(stats.getTodayDateStr(), /^\d{4}-\d{2}-\d{2}$/);
  });

  await t.test('[pomodoro-stats] session recording and reset logic', () => {
    stats.setPomoState({ pomoHistory: [] });
    stats.recordCompletedSession('Fokus', 25);
    const state = stats.getPomoState();
    assert.strictEqual(state.pomoHistory.length, 1);
    assert.strictEqual(state.pomoHistory[0].type, 'Fokus');

    stats.setPomoState({ pomoTodayDate: '1999-01-01', pomoTodayFocusSecs: 500 });
    stats.checkTodayReset();
    const updatedState = stats.getPomoState();
    assert.strictEqual(updatedState.pomoTodayFocusSecs, 0);
  });

  await t.test('[pomodoro-audio] notification permission request', async () => {
    assert.doesNotThrow(() => {
      audio.requestNotificationPermission();
    });
  });

  await t.test('[pomodoro-ui] updatePomoStatsUI and modal rendering', () => {
    assert.doesNotThrow(() => {
      ui.updatePomoStatsUI();
      ui.renderPomoHistoryModal();
    });
  });

  await t.test('[pomodoro-timer] setupPomodoro initialization', () => {
    assert.doesNotThrow(() => {
      timer.setupPomodoro();
    });
  });

});
