// Ruang Kerja (Multi-Workspace Management)

let wsPageIndex = 0;
const WS_PER_PAGE = 8;
let wsSearchQuery = '';

function updateWorkspaceSelectUI() {
  const currentNameSpan = document.getElementById('currentWorkspaceName');
  const activeWs = workspacesData.find(w => w.id === currentWorkspaceId) || workspacesData[0];
  if (currentNameSpan && activeWs) {
    currentNameSpan.textContent = activeWs.title;
  }

  const container = document.getElementById('workspaceListContainer');
  const countText = document.getElementById('workspaceCountText');
  const btnPrev = document.getElementById('btnWsPrevPage');
  const btnNext = document.getElementById('btnWsNextPage');

  // Filter workspaces based on search query
  const filteredWorkspaces = workspacesData.filter(ws => 
    ws.title.toLowerCase().includes(wsSearchQuery.toLowerCase())
  );

  if (countText) {
    countText.textContent = `${filteredWorkspaces.length} Ruang Kerja`;
  }

  // Adjust pagination index if out of bounds
  const totalPages = Math.ceil(filteredWorkspaces.length / WS_PER_PAGE) || 1;
  if (wsPageIndex >= totalPages) wsPageIndex = totalPages - 1;
  if (wsPageIndex < 0) wsPageIndex = 0;

  // Enable/Disable pagination buttons (icon only < >)
  if (btnPrev) btnPrev.disabled = (wsPageIndex === 0);
  if (btnNext) btnNext.disabled = (wsPageIndex >= totalPages - 1);

  if (!container) return;
  container.innerHTML = '';

  if (filteredWorkspaces.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.83rem; padding: 20px 0;">Tidak ada ruang kerja yang cocok</div>`;
    return;
  }

  // Slice for current page
  const pageItems = filteredWorkspaces.slice(wsPageIndex * WS_PER_PAGE, (wsPageIndex + 1) * WS_PER_PAGE);

  pageItems.forEach(ws => {
    const isActive = (ws.id === currentWorkspaceId);
    const item = document.createElement('div');
    item.className = 'workspace-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 6px;
      background: ${isActive ? 'rgba(97, 175, 239, 0.12)' : 'var(--bg-tertiary)'};
      border: 1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'};
    `;

    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; overflow: hidden;';
    infoDiv.innerHTML = `
      <i class="fa-solid fa-briefcase" style="color: ${isActive ? '#61afef' : 'var(--text-muted)'}; font-size: 0.9rem; flex-shrink: 0;"></i>
      <span style="font-weight: ${isActive ? '700' : '500'}; color: var(--text-main); font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ws.title}</span>
      ${isActive ? '<span style="font-size: 0.68rem; background: var(--accent-primary); color: #fff; padding: 2px 6px; border-radius: 10px; font-weight: 600; flex-shrink: 0;">Aktif</span>' : ''}
    `;

    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-shrink: 0;';

    if (!isActive) {
      const btnSelect = document.createElement('button');
      btnSelect.className = 'btn btn-secondary';
      btnSelect.style.cssText = 'padding: 4px 10px; font-size: 0.78rem;';
      btnSelect.innerHTML = '<i class="fa-solid fa-check"></i> Pilih';
      btnSelect.addEventListener('click', () => {
        currentWorkspaceId = ws.id;
        localStorage.setItem('currentWorkspaceId', currentWorkspaceId);
        updateWorkspaceSelectUI();
        renderBoard();
      });
      actionsDiv.appendChild(btnSelect);
    }

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-secondary';
    btnDelete.style.cssText = 'padding: 4px 8px; font-size: 0.78rem; color: #e06c75;';
    btnDelete.title = 'Hapus Ruang Kerja ini';
    btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
    
    if (workspacesData.length <= 1) {
      btnDelete.disabled = true;
      btnDelete.style.opacity = '0.4';
      btnDelete.style.cursor = 'not-allowed';
    } else {
      btnDelete.addEventListener('click', () => {
        deleteWorkspace(ws.id);
      });
    }
    actionsDiv.appendChild(btnDelete);

    item.appendChild(infoDiv);
    item.appendChild(actionsDiv);
    container.appendChild(item);
  });
}

function deleteWorkspace(wsId) {
  if (workspacesData.length <= 1) {
    showCustomAlert('Perhatian', 'Anda harus memiliki setidaknya satu Ruang Kerja.');
    return;
  }

  const wsObj = workspacesData.find(w => w.id === wsId);
  if (!wsObj) return;

  showCustomConfirm(
    'Hapus Ruang Kerja?',
    `Apakah Anda yakin ingin menghapus Ruang Kerja "${wsObj.title}"? Semua catatan dan kolom di dalamnya akan dihapus secara permanen.`,
    () => {
      notesData = notesData.filter(n => (n.workspace_id || 'ws-default') !== wsId);
      columnsData = columnsData.filter(c => (c.workspace_id || 'ws-default') !== wsId);
      workspacesData = workspacesData.filter(w => w.id !== wsId);

      if (currentWorkspaceId === wsId) {
        currentWorkspaceId = workspacesData[0].id;
        localStorage.setItem('currentWorkspaceId', currentWorkspaceId);
      }

      saveWorkspacesToServer();
      saveColumnsToServer();
      saveNotesToServer();

      updateWorkspaceSelectUI();
      renderBoard();
    }
  );
}

function setupWorkspaceUI() {
  const btnOpenModal = document.getElementById('btnOpenWorkspaceModal');
  const modal = document.getElementById('modalWorkspace');
  const btnCloseX = document.getElementById('btnCloseWorkspaceModal');
  const btnCancel = document.getElementById('btnCancelWorkspace');
  const btnSave = document.getElementById('btnSaveWorkspace');
  const inputTitle = document.getElementById('inputWsTitle');
  const inputSearch = document.getElementById('inputSearchWorkspace');
  const btnPrev = document.getElementById('btnWsPrevPage');
  const btnNext = document.getElementById('btnWsNextPage');

  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      wsSearchQuery = e.target.value;
      wsPageIndex = 0;
      updateWorkspaceSelectUI();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (wsPageIndex > 0) {
        wsPageIndex--;
        updateWorkspaceSelectUI();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      wsPageIndex++;
      updateWorkspaceSelectUI();
    });
  }

  if (btnOpenModal && modal) {
    btnOpenModal.addEventListener('click', () => {
      if (inputTitle) inputTitle.value = '';
      if (inputSearch) inputSearch.value = '';
      wsSearchQuery = '';
      wsPageIndex = 0;
      updateWorkspaceSelectUI();
      modal.classList.add('active');
    });
  }

  const closeModal = () => {
    if (modal) modal.classList.remove('active');
  };

  if (btnCloseX) btnCloseX.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const title = inputTitle ? inputTitle.value.trim() : '';
      if (!title) {
        showCustomAlert('Input Kosong', 'Mohon masukkan nama Ruang Kerja baru.');
        return;
      }

      const newId = 'ws-' + Date.now();
      const newWs = {
        id: newId,
        title: title,
        color: '#61afef',
        position: workspacesData.length + 1
      };

      workspacesData.push(newWs);

      // Create default 4 columns for this new Ruang Kerja
      const defaultCols = [
        { id: 'todo-' + newId, workspace_id: newId, title: 'To Do', default: true },
        { id: 'in_progress-' + newId, workspace_id: newId, title: 'In Progress', default: true },
        { id: 'review-' + newId, workspace_id: newId, title: 'Review', default: true },
        { id: 'done-' + newId, workspace_id: newId, title: 'Done', default: true }
      ];
      columnsData.push(...defaultCols);

      currentWorkspaceId = newId;
      localStorage.setItem('currentWorkspaceId', currentWorkspaceId);

      saveWorkspacesToServer();
      saveColumnsToServer();

      updateWorkspaceSelectUI();
      renderBoard();
      if (inputTitle) inputTitle.value = '';
    });
  }
}
