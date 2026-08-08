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

// Fetch notes from server/database
async function fetchNotes() {
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error('Network error');
    notesData = await res.json();
    renderBoard();
  } catch (err) {
    console.warn('API error, using local state:', err);
    renderBoard();
  }
}

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
