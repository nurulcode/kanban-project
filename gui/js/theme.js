// Theme Toggle (One Dark Pro vs Soft Light) & Focus Mode

// Immediately restore theme from localStorage to avoid visual flicker
(function() {
  try {
    const savedTheme = localStorage.getItem('kanban_theme');
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();

function setupThemeToggle() {
  const btnTheme = document.getElementById('btnThemeToggle');

  // 1. Initial theme load from localStorage
  const savedLocalTheme = localStorage.getItem('kanban_theme') || 'dark';
  applyTheme(savedLocalTheme);

  // 2. Fetch theme from backend SQLite DB (for persistence across app restarts / ephemeral webview)
  fetch('/api/theme')
    .then(r => r.json())
    .then(data => {
      if (data && data.theme) {
        applyTheme(data.theme);
        localStorage.setItem('kanban_theme', data.theme);
      }
    })
    .catch(() => {});

  if (!btnTheme) return;

  btnTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('kanban_theme', newTheme);

    // Save to SQLite DB backend
    fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    }).catch(err => console.error('Failed to save theme setting to backend:', err));
  });
}

function applyTheme(theme) {
  const themeIcon = document.getElementById('themeIcon');
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-sun';
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-moon';
    }
  }
}

function setupFocusMode() {
  const btnFocusMode = document.getElementById('btnFocusMode');
  if (btnFocusMode) {
    btnFocusMode.addEventListener('click', () => {
      document.body.classList.toggle('focus-mode-active');
      btnFocusMode.classList.toggle('active');
    });
  }
}

