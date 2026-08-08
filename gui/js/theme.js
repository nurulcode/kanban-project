// Theme Toggle (One Dark Pro vs Soft Light) & Focus Mode

function setupThemeToggle() {
  const btnTheme = document.getElementById('btnThemeToggle');
  if (!btnTheme) return;

  const savedTheme = localStorage.getItem('kanban_theme') || 'dark';
  applyTheme(savedTheme);

  btnTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('kanban_theme', newTheme);
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
