// State Management & API Services
let notesData = [];
let columnsData = [
  { id: 'todo', workspace_id: 'ws-default', title: 'To Do', default: true },
  { id: 'in_progress', workspace_id: 'ws-default', title: 'In Progress', default: true },
  { id: 'review', workspace_id: 'ws-default', title: 'Review', default: true },
  { id: 'done', workspace_id: 'ws-default', title: 'Done', default: true }
];
let workspacesData = [
  { id: 'ws-default', title: 'Ruang Kerja', color: '#61afef', position: 1 }
];
let currentWorkspaceId = localStorage.getItem('currentWorkspaceId') || 'ws-default';
let editingNoteId = null;
let draggedNoteId = null;

// Fetch workspaces from server
async function fetchWorkspaces() {
  try {
    const res = await fetch('/api/workspaces');
    if (!res.ok) throw new Error('Network error');
    workspacesData = await res.json();
    if (!workspacesData.find(w => w.id === currentWorkspaceId)) {
      currentWorkspaceId = workspacesData[0]?.id || 'ws-default';
    }
    updateWorkspaceSelectUI();
  } catch (err) {
    console.warn('Workspaces API error, using default:', err);
    updateWorkspaceSelectUI();
  }
}

let lastNotesHash = '';

// Fetch notes from server/database
async function fetchNotes() {
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error('Network error');
    notesData = await res.json();
    lastNotesHash = JSON.stringify(notesData);
    renderBoard();
  } catch (err) {
    console.warn('API error, using local state:', err);
    renderBoard();
  }
}

// Background auto-sync polling for live updates (e.g. from sticky notes)
async function fetchNotesSilent() {
  // Do not interrupt user while dragging or editing modal
  if (editingNoteId || draggedNoteId || document.getElementById('noteModal')?.style.display === 'flex') return;

  try {
    const res = await fetch('/api/notes');
    if (!res.ok) return;
    const newNotes = await res.json();
    const newHash = JSON.stringify(newNotes);
    if (newHash !== lastNotesHash) {
      lastNotesHash = newHash;
      notesData = newNotes;
      renderBoard();
    }
  } catch (err) {
    // Ignore error in background poll
  }
}

// Start periodic polling every 1.2 seconds for real-time synchronization
setInterval(fetchNotesSilent, 1200);

// Fetch dynamic columns from server
async function fetchColumns() {
  try {
    const res = await fetch('/api/columns');
    if (!res.ok) throw new Error('Network error');
    columnsData = await res.json();
    renderBoard();
  } catch (err) {
    console.warn('Columns API error, using defaults:', err);
    renderBoard();
  }
}

// Save workspaces to server
async function saveWorkspacesToServer() {
  try {
    await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspacesData)
    });
  } catch (err) {
    console.error('Failed to save workspaces:', err);
  }
}

// Save notes to server
async function saveNotesToServer() {
  try {
    lastNotesHash = JSON.stringify(notesData);
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notesData)
    });
  } catch (err) {
    console.error('Failed to save notes:', err);
  }
}

// Save columns to server
async function saveColumnsToServer() {
  try {
    await fetch('/api/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(columnsData)
    });
  } catch (err) {
    console.error('Failed to save columns:', err);
  }
}

// Popout Sticky Note Desktop Window
async function popoutStickyNote(noteId) {
  try {
    await fetch('/api/popout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId })
    });
  } catch (err) {
    console.error('Failed to popout sticky note:', err);
  }
}

async function exportNotesToMarkdown() {
  try {
    const res = await fetch('/api/export');
    if (!res.ok) throw new Error('Gagal melakukan export');
    const data = await res.json();
    if (data.success) {
      showCustomAlert('Catatan Berhasil Diexport! 🎉', `File dokumen Markdown telah disimpan di:\n${data.path}`);
    } else {
      showCustomAlert('Export Gagal', 'Gagal mengeksport catatan.');
    }
  } catch (err) {
    console.error('Export error:', err);
    showCustomAlert('Error Export', 'Terjadi kesalahan saat mengeksport data.');
  }
}
