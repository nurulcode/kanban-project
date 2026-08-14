// Modal Dialogs (Add/Edit Note & Detail Modal View)

function openModal() {
  const noteModal = document.getElementById('noteModal');
  const inputTitle = document.getElementById('inputTitle');
  noteModal.classList.add('active');
  inputTitle.focus();
}

function closeModal() {
  const noteModal = document.getElementById('noteModal');
  noteModal.classList.remove('active');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function openEditModal(noteId) {
  const note = notesData.find(n => n.id === noteId);
  if (!note) return;

  editingNoteId = noteId;
  document.getElementById('modalTitle').textContent = 'Edit Catatan';
  document.getElementById('noteId').value = note.id;
  document.getElementById('inputTitle').value = note.title;
  document.getElementById('inputContent').value = note.content || '';
  document.getElementById('inputColumn').value = note.column;
  document.getElementById('inputPriority').value = note.priority || 'medium';
  document.getElementById('inputTag').value = note.tag || '';
  document.getElementById('inputStartDate').value = note.startDate || '';
  document.getElementById('inputDueDate').value = note.dueDate || '';

  openModal();
}

function showCustomAlert(title, message) {
  const modal = document.getElementById('modalAlert');
  const titleEl = document.getElementById('alertTitle');
  const msgEl = document.getElementById('alertMessage');
  const btnOk = document.getElementById('btnAlertOk');

  if (!modal) {
    alert(`${title}: ${message}`);
    return;
  }

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  modal.classList.add('active');

  btnOk.onclick = () => {
    modal.classList.remove('active');
  };
}

function showCustomPrompt(title, placeholder, onConfirm) {
  const modal = document.getElementById('modalPrompt');
  const titleEl = document.getElementById('promptTitle');
  const inputEl = document.getElementById('inputPromptText');
  const btnOk = document.getElementById('btnPromptOk');
  const btnCancel = document.getElementById('btnPromptCancel');
  const btnCloseX = document.getElementById('btnPromptCloseX');

  if (!modal) {
    const val = prompt(title);
    if (val && val.trim()) onConfirm(val.trim());
    return;
  }

  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-square-plus" style="color: var(--accent-primary);"></i> ${title}`;
  if (inputEl) {
    inputEl.value = '';
    if (placeholder) inputEl.placeholder = placeholder;
  }

  modal.classList.add('active');
  setTimeout(() => { if (inputEl) inputEl.focus(); }, 100);

  const closePrompt = () => {
    modal.classList.remove('active');
    btnOk.onclick = null;
    btnCancel.onclick = null;
    if (btnCloseX) btnCloseX.onclick = null;
  };

  const handleSave = () => {
    const val = inputEl ? inputEl.value.trim() : '';
    closePrompt();
    if (val) onConfirm(val);
  };

  btnCancel.onclick = closePrompt;
  if (btnCloseX) btnCloseX.onclick = closePrompt;
  btnOk.onclick = handleSave;

  if (inputEl) {
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') handleSave();
    };
  }
}

function showCustomConfirm(title, message, onConfirm) {
  const modal = document.getElementById('modalConfirm');
  const titleEl = document.getElementById('confirmTitle');
  const msgEl = document.getElementById('confirmMessage');
  const btnOk = document.getElementById('btnConfirmOk');
  const btnCancel = document.getElementById('btnConfirmCancel');

  if (!modal) {
    if (confirm(`${title}\n${message}`)) onConfirm();
    return;
  }

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  modal.classList.add('active');

  const closeConfirm = () => {
    modal.classList.remove('active');
    btnOk.onclick = null;
    btnCancel.onclick = null;
  };

  btnCancel.onclick = closeConfirm;
  btnOk.onclick = () => {
    closeConfirm();
    onConfirm();
  };
}

function deleteNote(noteId) {
  showCustomConfirm(
    'Hapus Catatan?',
    'Apakah Anda yakin ingin menghapus catatan ini secara permanen?',
    () => {
      notesData = notesData.filter(n => n.id !== noteId);
      renderBoard();
      saveNotesToServer();
    }
  );
}

// Open Detail View Modal
window.openDetailModal = function(noteId) {
  const note = notesData.find(n => n.id === noteId);
  if (!note) return;

  document.getElementById('detailTitle').textContent = note.title;
  const prioEl = document.getElementById('detailPrio');
  prioEl.textContent = (note.priority || 'medium').toUpperCase();
  prioEl.className = `card-prio prio-${note.priority || 'medium'}`;
  document.getElementById('detailTag').textContent = `#${note.tag || 'Umum'}`;
  const dateParts = [];
  if (note.startDate) dateParts.push(`🗓️ Mulai: ${formatDisplayDate(note.startDate)}`);
  if (note.dueDate) dateParts.push(`🎯 Selesai: ${formatDisplayDate(note.dueDate)}`);
  if (dateParts.length === 0 && note.createdAt) {
    dateParts.push(`Dibuat: ${note.createdAt}`);
  }
  document.getElementById('detailDate').textContent = dateParts.join(' • ');
  
  const contentEl = document.getElementById('detailContent');
  contentEl.textContent = note.content || '(Tidak ada detail isi catatan)';

  const detailModal = document.getElementById('detailModal');
  const btnClose = document.getElementById('btnCloseDetailModal');
  const btnCancel = document.getElementById('btnDetailClose');
  const btnEdit = document.getElementById('btnDetailEdit');

  const closeDetail = () => detailModal.classList.remove('active');

  btnClose.onclick = closeDetail;
  btnCancel.onclick = closeDetail;
  btnEdit.onclick = () => {
    closeDetail();
    openEditModal(note.id);
  };

  detailModal.classList.add('active');
};

// Setup About / Author Modal
function setupAboutModal() {
  const btnAbout = document.getElementById('btnAbout');
  const aboutModal = document.getElementById('aboutModal');
  const btnCloseAboutModal = document.getElementById('btnCloseAboutModal');
  const btnCloseAbout = document.getElementById('btnCloseAbout');

  if (!btnAbout || !aboutModal) return;

  const close = () => aboutModal.classList.remove('active');
  btnAbout.onclick = () => aboutModal.classList.add('active');
  if (btnCloseAboutModal) btnCloseAboutModal.onclick = close;
  if (btnCloseAbout) btnCloseAbout.onclick = close;
}
