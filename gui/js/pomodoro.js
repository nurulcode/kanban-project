// Pomodoro Aggregator Entry Point
// Imports modular components for pomodoro timer, audio, stats, and UI.

if (typeof require !== 'undefined') {
  // Node.js environment - aggregate sub-modules
  const stats = require('./pomodoro-stats.js');
  const audio = require('./pomodoro-audio.js');
  const ui = require('./pomodoro-ui.js');
  const timer = require('./pomodoro-timer.js');

  Object.assign(global, stats, audio, ui, timer);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ...stats,
      ...audio,
      ...ui,
      ...timer
    };
  }
}
