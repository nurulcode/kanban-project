const test = require('node:test');
const assert = require('node:assert');

// Setup mock browser environment for Node.js
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

// Set up mock globals before requiring pomodoro.js
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

const pomodoro = require('./gui/js/pomodoro.js');

test('Unit Tests for pomodoro.js', async (t) => {

  await t.test('formatDurationText() formats seconds into human readable duration strings', () => {
    assert.strictEqual(pomodoro.formatDurationText(0), '0m');
    assert.strictEqual(pomodoro.formatDurationText(45), '45d');
    assert.strictEqual(pomodoro.formatDurationText(60), '1m');
    assert.strictEqual(pomodoro.formatDurationText(300), '5m');
    assert.strictEqual(pomodoro.formatDurationText(3600), '1j 0m');
    assert.strictEqual(pomodoro.formatDurationText(3660), '1j 1m');
    assert.strictEqual(pomodoro.formatDurationText(7250), '2j 0m');
  });

  await t.test('getTodayDateStr() returns date formatted as YYYY-MM-DD', () => {
    const todayStr = pomodoro.getTodayDateStr();
    assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    assert.strictEqual(todayStr, expected);
  });

  await t.test('recordCompletedSession() adds new session item to pomoHistory', () => {
    pomodoro.setPomoState({ pomoHistory: [] });
    pomodoro.recordCompletedSession('Fokus', 25);
    
    const state = pomodoro.getPomoState();
    assert.strictEqual(state.pomoHistory.length, 1);
    assert.strictEqual(state.pomoHistory[0].type, 'Fokus');
    assert.strictEqual(state.pomoHistory[0].durationMinutes, 25);
    assert.ok(state.pomoHistory[0].id.startsWith('pomo-'));
    assert.ok(state.pomoHistory[0].timestamp > 0);
  });

  await t.test('recalculateTodayStats() correctly computes focus, break, and session count for today', () => {
    const todayTs = Date.now();
    const history = [
      { id: `pomo-${todayTs}`, timestamp: todayTs, type: 'Fokus', durationMinutes: 25 },
      { id: `pomo-${todayTs - 1000}`, timestamp: todayTs - 1000, type: 'Istirahat', durationMinutes: 5 },
      { id: `pomo-${todayTs - 2000}`, timestamp: todayTs - 2000, type: 'Fokus', durationMinutes: 20 },
      // Yesterday session
      { id: 'pomo-1000000000000', timestamp: 1000000000000, type: 'Fokus', durationMinutes: 30 }
    ];

    pomodoro.setPomoState({
      pomoHistory: history,
      pomoTodayFocusSecs: 0,
      pomoTodayBreakSecs: 0
    });

    const count = pomodoro.recalculateTodayStats();
    const state = pomodoro.getPomoState();

    assert.strictEqual(count, 3, 'Today sessions count should be 3');
    assert.strictEqual(state.pomoTodayFocusSecs, (25 + 20) * 60, 'Today focus seconds should be (25+20)*60 = 2700');
    assert.strictEqual(state.pomoTodayBreakSecs, 5 * 60, 'Today break seconds should be 5*60 = 300');
  });

  await t.test('checkTodayReset() resets today stats when date changes', () => {
    pomodoro.setPomoState({
      pomoTodayDate: '2020-01-01',
      pomoTodayFocusSecs: 3600,
      pomoTodayBreakSecs: 600
    });

    pomodoro.checkTodayReset();
    const state = pomodoro.getPomoState();

    assert.strictEqual(state.pomoTodayDate, pomodoro.getTodayDateStr());
    assert.strictEqual(state.pomoTodayFocusSecs, 0);
    assert.strictEqual(state.pomoTodayBreakSecs, 0);
  });

  await t.test('getSessionDateObj() extracts Date object from history session item', () => {
    const ts = 1700000000000;
    const dateObjFromTs = pomodoro.getSessionDateObj({ timestamp: ts });
    assert.strictEqual(dateObjFromTs.getTime(), ts);

    const dateObjFromId = pomodoro.getSessionDateObj({ id: `pomo-${ts}` });
    assert.strictEqual(dateObjFromId.getTime(), ts);
  });

  await t.test('formatDateGroupHeaderLabel() formats headers for Today, Yesterday, and past dates', () => {
    const todayObj = new Date();
    const todayLabel = pomodoro.formatDateGroupHeaderLabel(todayObj);
    assert.ok(todayLabel.includes('Hari Ini'));

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayLabel = pomodoro.formatDateGroupHeaderLabel(yesterdayObj);
    assert.ok(yesterdayLabel.includes('Kemarin'));
  });

  await t.test('updatePomoStatsUI() updates stats elements in the DOM', () => {
    const todayTs = Date.now();
    const history = [
      { id: `pomo-${todayTs}`, timestamp: todayTs, type: 'Fokus', durationMinutes: 25 }
    ];

    pomodoro.setPomoState({
      pomoHistory: history,
      pomoTodayFocusSecs: 1500,
      pomoTodayBreakSecs: 300
    });

    pomodoro.updatePomoStatsUI();

    assert.strictEqual(getElementMock('totalFocusText').textContent, '25m');
    assert.strictEqual(getElementMock('totalBreakText').textContent, '5m');
    assert.strictEqual(getElementMock('modalTotalFocusText').textContent, '25m');
    assert.strictEqual(getElementMock('modalTotalBreakText').textContent, '5m');
    assert.strictEqual(getElementMock('modalTotalSessionsText').textContent, '1');
  });

});
