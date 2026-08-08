// Kanban Board & Dynamic Columns Management with Multi-Workspace Isolation

function renderBoard() {
  const kanbanBoard = document.getElementById('kanbanBoard');
  const searchInput = document.getElementById('searchInput');
  const filterPriority = document.getElementById('filterPriority');

  if (!kanbanBoard) return;

  const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
  const prioVal = filterPriority ? filterPriority.value : 'all';

  kanbanBoard.innerHTML = '';

  // Filter columns belonging to the active currentWorkspaceId
  let activeCols = columnsData.filter(col => (col.workspace_id || 'ws-default') === currentWorkspaceId);

  // If active workspace has no columns yet, generate 4 default columns for it
  if (activeCols.length === 0) {
    const defaultCols = [
      { id: 'todo-' + currentWorkspaceId, workspace_id: currentWorkspaceId, title: 'To Do', default: true },
      { id: 'in_progress-' + currentWorkspaceId, workspace_id: currentWorkspaceId, title: 'In Progress', default: true },
      { id: 'review-' + currentWorkspaceId, workspace_id: currentWorkspaceId, title: 'Review', default: true },
      { id: 'done-' + currentWorkspaceId, workspace_id: currentWorkspaceId, title: 'Done', default: true }
    ];
    columnsData.push(...defaultCols);
    activeCols = defaultCols;
    saveColumnsToServer();
  }

  // Filter notes for active workspace & search query
  let filteredNotes = notesData.filter(note => {
    const isSameWs = (note.workspace_id || 'ws-default') === currentWorkspaceId;
    const matchesSearch = (note.title || '').toLowerCase().includes(searchVal) ||
                          (note.content || '').toLowerCase().includes(searchVal) ||
                          (note.tag || '').toLowerCase().includes(searchVal);
    const matchesPrio = prioVal === 'all' || note.priority === prioVal;
    return isSameWs && matchesSearch && matchesPrio;
  });

  activeCols.forEach(col => {
    const colNotes = filteredNotes.filter(n => n.column === col.id);
    const colId = col.id;

    const section = document.createElement('section');
    section.className = `kanban-column column-${colId}`;

    const isDefault = col.default || ['todo', 'in_progress', 'review', 'done'].includes(colId);
    const deleteBtnHtml = !isDefault
      ? `<button class="column-delete-btn" onclick="deleteCustomColumn('${colId}')" title="Hapus Kolom Kustom">&times;</button>`
      : '';

    section.innerHTML = `
      <div class="column-header">
        <div class="column-title">
          <span class="status-dot dot-${colId}"></span>
          <h2>${escapeHtml(col.title)}</h2>
          <span class="column-badge">${colNotes.length}</span>
        </div>
        ${deleteBtnHtml}
      </div>
      <div class="cards-container" id="cards-${colId}" data-column="${colId}"></div>
    `;

    const container = section.querySelector('.cards-container');
    colNotes.forEach(note => {
      const cardEl = createCardElement(note);
      container.appendChild(cardEl);
    });

    kanbanBoard.appendChild(section);
  });

  setupDragAndDrop();
  updateSelectColumnOptions();
  
  const activeWsNotes = notesData.filter(n => (n.workspace_id || 'ws-default') === currentWorkspaceId);
  const total = activeWsNotes.length;
  const doneCount = activeWsNotes.filter(n => n.column.includes('done')).length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  
  const totalEl = document.getElementById('totalCount');
  if (totalEl) totalEl.textContent = total;

  const pctEl = document.getElementById('progressPercent');
  if (pctEl) pctEl.textContent = `${progressPct}%`;
}

// Delete Custom Column (Default 4 columns cannot be deleted)
function deleteCustomColumn(colId) {
  showCustomConfirm(
    'Hapus Kolom?',
    'Apakah Anda yakin ingin menghapus kolom ini? Catatan di dalamnya akan dipindahkan ke kolom pertama.',
    () => {
      const activeCols = columnsData.filter(c => (c.workspace_id || 'ws-default') === currentWorkspaceId);
      const fallbackCol = activeCols[0] ? activeCols[0].id : 'todo';

      notesData.forEach(note => {
        if (note.column === colId) {
          note.column = fallbackCol;
        }
      });
      columnsData = columnsData.filter(c => c.id !== colId);
      renderBoard();
      saveNotesToServer();
      saveColumnsToServer();
    }
  );
}

// Update Column Select Options in Form Modal
function updateSelectColumnOptions() {
  const inputColumn = document.getElementById('inputColumn');
  if (!inputColumn) return;

  const activeCols = columnsData.filter(c => (c.workspace_id || 'ws-default') === currentWorkspaceId);
  const currentVal = inputColumn.value;

  inputColumn.innerHTML = '';
  activeCols.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col.id;
    opt.textContent = col.title;
    inputColumn.appendChild(opt);
  });

  if (currentVal && activeCols.some(c => c.id === currentVal)) {
    inputColumn.value = currentVal;
  }
}

// Create Card Element
function createCardElement(note) {
  const card = document.createElement('div');
  card.className = 'kanban-card';
  card.draggable = true;
  card.dataset.id = note.id;

  const prioClass = `prio-${note.priority || 'medium'}`;

  const activeCols = columnsData.filter(c => (c.workspace_id || 'ws-default') === currentWorkspaceId);
  const colIds = activeCols.map(c => c.id);
  const colIndex = colIds.indexOf(note.column);
  const canMoveLeft = colIndex > 0;
  const canMoveRight = colIndex < colIds.length - 1;

  // Same column vertical order checks
  const sameColNotes = notesData.filter(n => (n.workspace_id || 'ws-default') === currentWorkspaceId && n.column === note.column);
  const noteIndexInCol = sameColNotes.findIndex(n => n.id === note.id);
  const canMoveUp = noteIndexInCol > 0;
  const canMoveDown = noteIndexInCol < sameColNotes.length - 1;

  card.innerHTML = `
    <div class="card-top">
      <h3 class="card-title">${escapeHtml(note.title)}</h3>
      <span class="card-prio ${prioClass}">${escapeHtml(note.priority || 'medium')}</span>
    </div>
    ${note.content ? `<div class="card-content">${escapeHtml(note.content)}</div>` : ''}
    <div class="card-footer">
      <span class="card-tag">${escapeHtml(note.tag || 'Umum')}</span>
      <div class="card-actions">
        <button class="icon-btn" onclick="popoutStickyNote('${note.id}')" title="Tempel ke Desktop (Sticky Note)"><i class="fa-solid fa-thumbtack"></i></button>
        ${canMoveUp ? `<button class="icon-btn" onclick="moveNoteVertical('${note.id}', -1)" title="Geser ke Atas"><i class="fa-solid fa-chevron-up"></i></button>` : ''}
        ${canMoveDown ? `<button class="icon-btn" onclick="moveNoteVertical('${note.id}', 1)" title="Geser ke Bawah"><i class="fa-solid fa-chevron-down"></i></button>` : ''}
        ${canMoveLeft ? `<button class="icon-btn" onclick="moveNoteColumn('${note.id}', -1)" title="Pindah Kiri"><i class="fa-solid fa-chevron-left"></i></button>` : ''}
        ${canMoveRight ? `<button class="icon-btn" onclick="moveNoteColumn('${note.id}', 1)" title="Pindah Kanan"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
        <button class="icon-btn" onclick="openEditModal('${note.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn icon-btn-danger" onclick="deleteNote('${note.id}')" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
  `;

  // Click card body to open Detail Modal
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.card-actions')) {
      openDetailModal(note.id);
    }
  });

  // Drag listeners
  card.addEventListener('dragstart', (e) => {
    draggedNoteId = note.id;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', note.id);

    if (!dragPlaceholder) {
      dragPlaceholder = document.createElement('div');
      dragPlaceholder.className = 'card-placeholder';
    }
    dragPlaceholder.style.height = (card.offsetHeight || 60) + 'px';

    setTimeout(() => {
      if (card.parentNode && dragPlaceholder) {
        card.parentNode.insertBefore(dragPlaceholder, card.nextElementSibling);
      }
    }, 0);
  });

  card.addEventListener('dragend', () => {
    draggedNoteId = null;
    card.classList.remove('dragging');
    if (dragPlaceholder && dragPlaceholder.parentNode) {
      dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    }
    dragPlaceholder = null;
  });

  return card;
}

let dragPlaceholder = null;

// Get element after which dragged element should be placed (Vertical Reordering)
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging):not(.card-placeholder)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Drag and Drop Logic (Vertical & Horizontal Reordering)
function setupDragAndDrop() {
  const containers = document.querySelectorAll('.cards-container');

  containers.forEach(container => {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');

      if (!dragPlaceholder) return;

      const afterElement = getDragAfterElement(container, e.clientY);
      const currentNext = dragPlaceholder.nextElementSibling;
      if (afterElement !== currentNext) {
        if (afterElement == null) {
          container.appendChild(dragPlaceholder);
        } else {
          container.insertBefore(dragPlaceholder, afterElement);
        }
      }
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');

      const targetCol = container.dataset.column;
      if (!draggedNoteId || !targetCol) return;

      const draggedNoteIndex = notesData.findIndex(n => n.id === draggedNoteId);
      if (draggedNoteIndex === -1) return;

      const [draggedNote] = notesData.splice(draggedNoteIndex, 1);
      draggedNote.column = targetCol;
      draggedNote.workspace_id = currentWorkspaceId;

      if (dragPlaceholder && dragPlaceholder.parentNode) {
        const nextCard = dragPlaceholder.nextElementSibling;
        if (nextCard && nextCard.classList.contains('kanban-card') && !nextCard.classList.contains('dragging')) {
          const afterId = nextCard.dataset.id;
          const targetIndex = notesData.findIndex(n => n.id === afterId);
          if (targetIndex !== -1) {
            notesData.splice(targetIndex, 0, draggedNote);
          } else {
            notesData.push(draggedNote);
          }
        } else {
          notesData.push(draggedNote);
        }
        dragPlaceholder.parentNode.removeChild(dragPlaceholder);
      } else {
        notesData.push(draggedNote);
      }

      dragPlaceholder = null;
      renderBoard();
      saveNotesToServer();
    });
  });
}

// Move Note left/right using arrow buttons
function moveNoteColumn(noteId, direction) {
  const note = notesData.find(n => n.id === noteId);
  if (!note) return;

  const activeCols = columnsData.filter(c => (c.workspace_id || 'ws-default') === currentWorkspaceId);
  const colIds = activeCols.map(c => c.id);
  const currentIndex = colIds.indexOf(note.column);
  const newIndex = currentIndex + direction;

  if (newIndex >= 0 && newIndex < colIds.length) {
    note.column = colIds[newIndex];
    renderBoard();
    saveNotesToServer();
  }
}

// Move Note up/down vertically inside same column
function moveNoteVertical(noteId, direction) {
  const currentIndex = notesData.findIndex(n => n.id === noteId);
  if (currentIndex === -1) return;

  const note = notesData[currentIndex];
  const sameColNotes = notesData.filter(n => (n.workspace_id || 'ws-default') === currentWorkspaceId && n.column === note.column);
  const colIndex = sameColNotes.findIndex(n => n.id === noteId);
  const targetColIndex = colIndex + direction;

  if (targetColIndex >= 0 && targetColIndex < sameColNotes.length) {
    const targetNote = sameColNotes[targetColIndex];
    const targetIndex = notesData.findIndex(n => n.id === targetNote.id);

    // Swap position in notesData array
    notesData.splice(currentIndex, 1);
    notesData.splice(targetIndex, 0, note);

    renderBoard();
    saveNotesToServer();
  }
}

// Mouse Click & Drag Horizontal Scroll (Pan Scroll)
function setupMouseDragScroll() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  board.addEventListener('mousedown', (e) => {
    if (e.target.closest('.kanban-card') ||
        e.target.closest('.btn') ||
        e.target.closest('input') ||
        e.target.closest('select') ||
        e.target.closest('textarea') ||
        e.target.closest('.column-delete-btn')) {
      return;
    }
    isDown = true;
    board.classList.add('is-dragging-board');
    startX = e.pageX - board.offsetLeft;
    scrollLeft = board.scrollLeft;
  });

  board.addEventListener('mouseleave', () => {
    isDown = false;
    board.classList.remove('is-dragging-board');
  });

  board.addEventListener('mouseup', () => {
    isDown = false;
    board.classList.remove('is-dragging-board');
  });

  board.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - board.offsetLeft;
    const walk = (x - startX) * 1.5;
    board.scrollLeft = scrollLeft - walk;
  });
}
