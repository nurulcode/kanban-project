// Main Application Entry Point

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  const safetyTimeout = setTimeout(() => {
    hideAppLoader();
  }, 3500);

  try {
    updateLoaderProgress(25, 'Memuat Ruang Kerja...');
    await fetchWorkspaces();

    updateLoaderProgress(60, 'Memuat Kolom & Catatan...');
    await Promise.all([fetchColumns(), fetchNotes()]);

    updateLoaderProgress(90, 'Menyiapkan Antarmuka...');
    setupFormEventListeners();
    setupWorkspaceUI();
    setupGlobalEventListeners();
    setupPomodoro();
    setupMouseDragScroll();

    updateLoaderProgress(100, 'Aplikasi Siap!');
  } catch (err) {
    console.error('Initialization error:', err);
  } finally {
    clearTimeout(safetyTimeout);
    setTimeout(() => {
      hideAppLoader();
    }, 300);
  }
}

function updateLoaderProgress(percent, text) {
  const bar = document.getElementById('loaderBarFill');
  const status = document.getElementById('loaderStatusText');
  if (bar) bar.style.width = percent + '%';
  if (status && text) status.textContent = text;
}

function hideAppLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 450);
  }
}

function setupFormEventListeners() {
  const btnNewNote = document.getElementById('btnNewNote');
  const btnAddColumn = document.getElementById('btnAddColumn');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const noteForm = document.getElementById('noteForm');

  if (btnNewNote) {
    btnNewNote.addEventListener('click', () => {
      editingNoteId = null;
      document.getElementById('modalTitle').textContent = 'Tambah Catatan Baru';
      noteForm.reset();
      document.getElementById('noteId').value = '';
      openModal();
    });
  }

  if (btnAddColumn) {
    btnAddColumn.addEventListener('click', () => {
      showCustomPrompt(
        'Tambah Kolom Kustom',
        'Misal: Backlog, Testing, Ideas...',
        (title) => {
          const newColId = 'custom_' + Date.now();
          columnsData.push({ id: newColId, workspace_id: currentWorkspaceId, title: title, default: false });
          renderBoard();
          saveColumnsToServer();
        }
      );
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (noteForm) {
    noteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('inputTitle').value.trim();
      const content = document.getElementById('inputContent').value.trim();
      const column = document.getElementById('inputColumn').value;
      const priority = document.getElementById('inputPriority').value;
      const tag = document.getElementById('inputTag').value.trim();

      if (!title) return;

      if (editingNoteId) {
        const note = notesData.find(n => n.id === editingNoteId);
        if (note) {
          note.title = title;
          note.content = content;
          note.column = column;
          note.priority = priority;
          note.tag = tag;
        }
      } else {
        const newNote = {
          id: 'note-' + Date.now(),
          workspace_id: currentWorkspaceId,
          title,
          content,
          column,
          priority,
          tag,
          createdAt: new Date().toLocaleString('id-ID')
        };
        notesData.unshift(newNote);
      }

      closeModal();
      renderBoard();
      saveNotesToServer();
    });
  }
}

function setupGlobalEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const filterPriority = document.getElementById('filterPriority');
  const btnExportMd = document.getElementById('btnExportMd');

  if (searchInput) searchInput.addEventListener('input', renderBoard);
  if (filterPriority) filterPriority.addEventListener('change', renderBoard);
  if (btnExportMd) btnExportMd.addEventListener('click', exportNotesToMarkdown);

  setupThemeToggle();
  setupFocusMode();
  setupAboutModal();
  setupAutostartToggle();
  setupMoreMenu();
}

function setupMoreMenu() {
  const moreWrapper = document.getElementById('moreMenuWrapper');
  const btnMore = document.getElementById('btnMoreMenu');
  if (btnMore && moreWrapper) {
    btnMore.addEventListener('click', (e) => {
      e.stopPropagation();
      moreWrapper.classList.toggle('active');
    });
    document.addEventListener('click', () => {
      moreWrapper.classList.remove('active');
    });
  }
}

function setupAutostartToggle() {
  const btn = document.getElementById('btnAutostart');
  if (!btn) return;

  let isEnabled = false;

  const updateUI = (active) => {
    isEnabled = active;
    if (active) {
      btn.classList.add('active');
      btn.style.borderColor = '#98c379';
      btn.style.color = '#98c379';
      btn.title = 'Autostart Aktif (Aplikasi akan otomatis berjalan saat komputer dinyalakan)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.title = 'Jalankan Otomatis Saat Booting (Autostart)';
    }
  };

  fetch('/api/autostart')
    .then(r => r.json())
    .then(data => updateUI(!!data.enabled))
    .catch(() => {});

  btn.addEventListener('click', () => {
    const targetState = !isEnabled;
    fetch('/api/autostart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: targetState })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          updateUI(targetState);
          showCustomAlert(
            targetState ? 'Autostart Aktif' : 'Autostart Nonaktif',
            targetState
              ? '✅ Autostart Berhasil Diaktifkan!\nAplikasi akan otomatis berjalan saat komputer booting.'
              : 'ℹ️ Autostart Dimatikan.'
          );
        }
      })
      .catch(err => console.error(err));
  });
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
