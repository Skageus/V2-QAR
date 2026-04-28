/* ══════════════════════════════════════════════════
   QED Asset Registry — Shared JavaScript
   ══════════════════════════════════════════════════ */

/* ── CREDENTIALS (frontend demo only) ─────────────────────── */
const ADMIN_EMAIL = 'operations@qedi-ng.com';
const ADMIN_PASS  = 'Qedi@1234';

/* ── STATE ─────────────────────────────────────────────────── */
let assets      = JSON.parse(localStorage.getItem('qed_assets') || '[]');
let role        = localStorage.getItem('qed_role') || 'guest';
let editId      = null;
let sortKey     = 'code';
let sortDir     = 1;
let currentView = 'cards';
let previousView = 'cards';

// Initialize: Generate missing QR codes on page load
async function initializeQRCodes() {
  if (role === 'admin' && window.QRCode) {
    const assetsNeedingQR = assets.filter(a => !a.qrCode);
    if (assetsNeedingQR.length > 0) {
      console.log(`Generating ${assetsNeedingQR.length} missing QR codes...`);
      for (const asset of assetsNeedingQR) {
        await attachQRToAsset(asset);
      }
      save();
      console.log(`QR codes generated and saved.`);
    }
  }
}

/* ── HELPERS ───────────────────────────────────────────────── */
function save() { localStorage.setItem('qed_assets', JSON.stringify(assets)); }
function saveRole(r) { localStorage.setItem('qed_role', r); }
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── MAINTENANCE LOGS ──────────────────────────────────────── */
function getMaintenanceLogs(assetId) {
  const key = `qed_maint_${assetId}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function saveMaintenanceLogs(assetId, logs) {
  localStorage.setItem(`qed_maint_${assetId}`, JSON.stringify(logs));
}
function addMaintenanceLog(assetId, logData) {
  const logs = getMaintenanceLogs(assetId);
  logs.push({ ...logData, id: Date.now() });
  logs.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveMaintenanceLogs(assetId, logs);
}
function deleteMaintenanceLog(assetId, logId) {
  const logs = getMaintenanceLogs(assetId).filter(l => l.id !== logId);
  saveMaintenanceLogs(assetId, logs);
}
function updateMaintenanceLog(assetId, logId, logData) {
  let logs = getMaintenanceLogs(assetId);
  logs = logs.map(l => l.id === logId ? { ...logData, id: logId } : l);
  logs.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveMaintenanceLogs(assetId, logs);
}

/* ── AUTH ──────────────────────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginError');
  if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
    saveRole('admin');
    err.classList.remove('show');
    window.location.href = 'admin-access.html';
  } else {
    err.classList.add('show');
  }
}
function doGuest() { saveRole('guest'); window.location.href = 'guest.html'; }
function doLogout() { saveRole('guest'); window.location.href = 'index.html'; }

/* ── CODE GENERATION ───────────────────────────────────────── */
function locCode(l) {
  const s = l.trim().toUpperCase();
  if (!s) return 'GEN';
  const m = { 'PORT HARCOURT': 'PH', 'PH': 'PH', 'LAGOS': 'LAG', 'LAG': 'LAG', 'ABUJA': 'ABJ', 'ABJ': 'ABJ' };
  return m[s] || s.replace(/\s+/g, '').slice(0, 3);
}
function catCode(c) {
  const s = c.trim().toUpperCase().replace(/\s+/g, '');
  return (!s || s === 'UNCATEGORISED') ? 'GEN' : s.slice(0, Math.min(3, s.length));
}
function nextSerial(cat, loc) {
  const prefix = `QED/${cat}/${loc}/`;
  let max = 0;
  assets.forEach(a => {
    if (a.code && a.code.startsWith(prefix)) {
      const n = parseInt(a.code.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return String(max + 1).padStart(3, '0');
}
function generateCode(cat, loc) {
  const c = catCode(cat), l = locCode(loc);
  return `QED/${c}/${l}/${nextSerial(c, l)}`;
}

/* ── NAVIGATION ────────────────────────────────────────────── */
function switchView(v) {
  currentView = v;
  const cardsView   = document.getElementById('cardsView');
  const tableView   = document.getElementById('tableView');
  const detailView  = document.getElementById('detailView');
  const maintView   = document.getElementById('maintView');
  if (cardsView)  cardsView.style.display  = v === 'cards' ? '' : 'none';
  if (tableView)  tableView.style.display  = v === 'table' ? '' : 'none';
  if (detailView) detailView.style.display = 'none';
  if (maintView)  maintView.style.display  = 'none';
  const tabCards = document.getElementById('tabCards');
  const tabTable = document.getElementById('tabTable');
  if (tabCards) tabCards.classList.toggle('active', v === 'cards');
  if (tabTable) tabTable.classList.toggle('active', v === 'table');
  if (v === 'table') { renderTable(); updateCatFilter(); }
}
function goHome() { switchView(currentView); }

/* ── DETAIL VIEW ───────────────────────────────────────────── */
function openDetail(id) {
  const a = assets.find(x => x.id === id);
  if (!a) return;
  previousView = currentView;
  ['cardsView','tableView','maintView'].forEach(vid => {
    const el = document.getElementById(vid); if (el) el.style.display = 'none';
  });
  const detailView = document.getElementById('detailView');
  if (detailView) detailView.style.display = '';

  const iw = document.getElementById('detailImgWrap');
  iw.innerHTML = a.image
    ? `<img src="${esc(a.image)}" alt="${esc(a.name)}" onerror="this.parentElement.innerHTML='<div class=detail-img-ph><i class=fas fa-box></i></div>'">`
    : `<div class="detail-img-ph"><i class="fas fa-box"></i></div>`;

  document.getElementById('detailCode').innerHTML = `<i class="fas fa-tag"></i> ${esc(a.code || '—')}`;
  document.getElementById('detailName').textContent = a.name;
  document.getElementById('detailDesc').textContent = a.description || 'No description provided.';

  const logs = getMaintenanceLogs(id);
  const today = new Date();
  const upcoming = logs.filter(l => l.type === 'scheduled' && new Date(l.date) >= today).sort((a,b) => new Date(a.date)-new Date(b.date));
  const last     = logs.filter(l => l.type === 'completed').sort((a,b) => new Date(b.date)-new Date(a.date));
  const nextMaint = upcoming[0];
  const lastMaint = last[0];

  const rows = [
    ['Owner / Custodian', a.owner || '—'],
    ['Department', a.department || '—'],
    ['Location', a.location || '—'],
    ['Serial / Model', a.serial || '—'],
    ['Category', a.category || '—'],
    ['Purchase Date', a.purchaseDate ? formatDate(a.purchaseDate) : '—'],
    ['Status', a.status || 'Available'],
    ['Last Maintenance', lastMaint ? `${formatDate(lastMaint.date)} — ${esc(lastMaint.title)}` : '—'],
    ['Next Maintenance', nextMaint ? `${formatDate(nextMaint.date)} — ${esc(nextMaint.title)}` : '—'],
  ];
  document.getElementById('detailOwnerRows').innerHTML = rows.map(([l, v]) =>
    `<div class="detail-row"><span class="detail-row-label">${esc(l)}</span><span class="detail-row-value">${v}</span></div>`
  ).join('');
  document.getElementById('detailSpecs').textContent = a.specs || 'No specifications listed.';

  const da = document.getElementById('detailActions');
  da.innerHTML = `<button class="btn-maint-log" onclick="openMaintView(${a.id})"><i class="fas fa-wrench"></i> Maintenance Logs</button><button class="btn-qr" onclick="showQR(${a.id},event)"><i class="fas fa-qrcode"></i> QR Code</button>`;
  if (role === 'admin') {
    da.innerHTML += `<button class="btn-submit" onclick="editFromDetail(${a.id})">Edit Asset</button><button class="btn-cancel" onclick="deleteFromDetail(${a.id})">Delete</button>`;
  }
}

function closeDetail() {
  document.getElementById('detailView').style.display = 'none';
  switchView(previousView);
}
function editFromDetail(id)   { closeDetail(); setTimeout(() => editAsset(id), 80); }
function deleteFromDetail(id) {
  if (!confirm('Delete this asset?')) return;
  assets = assets.filter(a => a.id !== id);
  save(); closeDetail();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── MAINTENANCE VIEW ──────────────────────────────────────── */
let maintAssetId = null;
let maintEditId  = null;

function openMaintView(assetId) {
  maintAssetId = assetId;
  maintEditId  = null;
  const a = assets.find(x => x.id === assetId);
  if (!a) return;

  ['cardsView','tableView','detailView'].forEach(vid => {
    const el = document.getElementById(vid); if (el) el.style.display = 'none';
  });
  const mv = document.getElementById('maintView');
  if (mv) mv.style.display = '';

  document.getElementById('maintAssetName').textContent = a.name;
  document.getElementById('maintAssetCode').textContent = a.code || '';

  renderMaintLogs();
  hideMaintForm();
}

function closeMaintView() {
  document.getElementById('maintView').style.display = 'none';
  openDetail(maintAssetId);
}

function renderMaintLogs() {
  if (!maintAssetId) return;
  const logs  = getMaintenanceLogs(maintAssetId);
  const today = new Date();

  const completed = logs.filter(l => l.type === 'completed').sort((a,b) => new Date(b.date)-new Date(a.date));
  const scheduled = logs.filter(l => l.type === 'scheduled').sort((a,b) => new Date(a.date)-new Date(b.date));

  // Summary counts
  const overdue = scheduled.filter(l => new Date(l.date) < today).length;
  document.getElementById('maintSummaryTotal').textContent    = logs.length;
  document.getElementById('maintSummaryDone').textContent     = completed.length;
  document.getElementById('maintSummaryUpcoming').textContent = scheduled.filter(l => new Date(l.date) >= today).length;
  document.getElementById('maintSummaryOverdue').textContent  = overdue;

  function logRow(l) {
    const isOverdue = l.type === 'scheduled' && new Date(l.date) < today;
    const typeBadge = l.type === 'completed'
      ? `<span class="maint-badge completed">Completed</span>`
      : isOverdue
        ? `<span class="maint-badge overdue">Overdue</span>`
        : `<span class="maint-badge scheduled">Scheduled</span>`;
    const acts = role === 'admin'
      ? `<div class="td-actions"><button class="btn-edit" onclick="event.stopPropagation();startEditMaint(${l.id})">Edit</button><button class="btn-del" onclick="event.stopPropagation();deleteMaintLog(${l.id})">Delete</button></div>`
      : '';
    return `<tr>
      <td>${formatDate(l.date)}</td>
      <td style="font-weight:500;color:var(--navy)">${esc(l.title)}</td>
      <td>${typeBadge}</td>
      <td style="color:var(--gray);font-size:0.8rem">${esc(l.technician || '—')}</td>
      <td style="color:var(--gray);font-size:0.8rem">${esc(l.cost ? '₦' + Number(l.cost).toLocaleString() : '—')}</td>
      <td style="color:var(--gray);font-size:0.8rem;max-width:200px">${esc(l.notes || '—')}</td>
      <td>${acts}</td>
    </tr>`;
  }

  const prevBody = document.getElementById('maintPrevBody');
  const nextBody = document.getElementById('maintNextBody');

  prevBody.innerHTML = completed.length
    ? completed.map(logRow).join('')
    : `<tr><td colspan="7" class="maint-empty-row">No completed maintenance records.</td></tr>`;

  nextBody.innerHTML = scheduled.length
    ? scheduled.map(logRow).join('')
    : `<tr><td colspan="7" class="maint-empty-row">No scheduled maintenance entries.</td></tr>`;
}

function showMaintForm(prefillType) {
  if (role !== 'admin') return;
  maintEditId = null;
  document.getElementById('maintFormSection').style.display = '';
  document.getElementById('mf-title').value       = '';
  document.getElementById('mf-date').value        = '';
  document.getElementById('mf-type').value        = prefillType || 'completed';
  document.getElementById('mf-technician').value  = '';
  document.getElementById('mf-cost').value        = '';
  document.getElementById('mf-notes').value       = '';
  document.getElementById('maintFormTitle').textContent  = 'Add Maintenance Entry';
  document.getElementById('maintSubmitBtn').textContent  = 'Save Entry';
  document.getElementById('maintFormSection').scrollIntoView({ behavior: 'smooth' });
}

function hideMaintForm() {
  const fs = document.getElementById('maintFormSection');
  if (fs) fs.style.display = 'none';
  maintEditId = null;
}

function startEditMaint(logId) {
  if (role !== 'admin') return;
  const logs = getMaintenanceLogs(maintAssetId);
  const l = logs.find(x => x.id === logId);
  if (!l) return;
  maintEditId = logId;
  document.getElementById('maintFormSection').style.display = '';
  document.getElementById('mf-title').value      = l.title || '';
  document.getElementById('mf-date').value       = l.date  || '';
  document.getElementById('mf-type').value       = l.type  || 'completed';
  document.getElementById('mf-technician').value = l.technician || '';
  document.getElementById('mf-cost').value       = l.cost  || '';
  document.getElementById('mf-notes').value      = l.notes || '';
  document.getElementById('maintFormTitle').textContent = 'Edit Maintenance Entry';
  document.getElementById('maintSubmitBtn').textContent = 'Update Entry';
  document.getElementById('maintFormSection').scrollIntoView({ behavior: 'smooth' });
}

function submitMaintLog() {
  if (role !== 'admin') return;
  const title = document.getElementById('mf-title').value.trim();
  const date  = document.getElementById('mf-date').value;
  if (!title || !date) {
    if (!title) flashEl('mf-title');
    if (!date)  flashEl('mf-date');
    return;
  }
  const logData = {
    title,
    date,
    type:       document.getElementById('mf-type').value,
    technician: document.getElementById('mf-technician').value.trim(),
    cost:       document.getElementById('mf-cost').value.trim(),
    notes:      document.getElementById('mf-notes').value.trim(),
  };
  if (maintEditId) {
    updateMaintenanceLog(maintAssetId, maintEditId, logData);
  } else {
    addMaintenanceLog(maintAssetId, logData);
  }
  hideMaintForm();
  renderMaintLogs();
}

function deleteMaintLog(logId) {
  if (role !== 'admin') return;
  if (!confirm('Delete this maintenance entry?')) return;
  deleteMaintenanceLog(maintAssetId, logId);
  renderMaintLogs();
}

function flashEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus(); el.style.borderColor = 'var(--red)';
  setTimeout(() => el.style.borderColor = '', 1200);
}

/* ── APPLY ROLE UI ─────────────────────────────────────────── */
function applyRole() {
  const isAdmin = role === 'admin';
  const roleBadge   = document.getElementById('roleBadge');
  const addBtn      = document.getElementById('addBtn');
  const guestBanner = document.getElementById('guestBanner');
  if (roleBadge)   { roleBadge.textContent = isAdmin ? '🔑 Admin' : '👁 Guest'; roleBadge.className = 'role-badge ' + role; }
  if (addBtn)      { addBtn.style.display  = isAdmin ? '' : 'none'; }
  if (guestBanner) { guestBanner.style.display = isAdmin ? 'none' : ''; }
}

/* ── FORM FIELDS ───────────────────────────────────────────── */
const fields = ['name', 'category', 'location', 'image', 'description', 'specs', 'owner', 'department', 'serial', 'purchaseDate', 'code'];

function clearForm()  { fields.forEach(f => { const el = document.getElementById('f-' + f); if (el) el.value = ''; }); }
function clearFormT() { fields.forEach(f => { const el = document.getElementById('ft-' + f); if (el) el.value = ''; }); }
function getForm()  { return Object.fromEntries(fields.map(f => [f, (document.getElementById('f-' + f) || {}).value?.trim() || ''])); }
function getFormT() { return Object.fromEntries(fields.map(f => [f, (document.getElementById('ft-' + f) || {}).value?.trim() || ''])); }
function fillForm(a)  { fields.forEach(f => { const el = document.getElementById('f-' + f); if (el) el.value = a[f] || ''; }); }
function fillFormT(a) { fields.forEach(f => { const el = document.getElementById('ft-' + f); if (el) el.value = a[f] || ''; }); }

function toggleForm() {
  if (role !== 'admin') return;
  const p = document.getElementById(currentView === 'table' ? 'formPanelT' : 'formPanel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? '' : 'none';
  if (p.style.display === 'none') { cancelForm(); cancelFormT(); }
  else {
    document.getElementById('addBtn').textContent = '✕ Close Form';
    p.scrollIntoView({ behavior: 'smooth' });
  }
}

function cancelForm() {
  editId = null; clearForm();
  const fp = document.getElementById('formPanel');
  if (fp) fp.style.display = 'none';
  const addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.textContent = '+ Add Asset';
  const ft = document.getElementById('formTitle');
  if (ft) ft.textContent = 'New Asset';
  const sb = document.getElementById('submitBtn');
  if (sb) sb.textContent = 'Add Asset';
}
function cancelFormT() {
  editId = null; clearFormT();
  const fp = document.getElementById('formPanelT');
  if (fp) fp.style.display = 'none';
  const addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.textContent = '+ Add Asset';
  const ft = document.getElementById('formTitleT');
  if (ft) ft.textContent = 'New Asset';
  const sb = document.getElementById('submitBtnT');
  if (sb) sb.textContent = 'Add Asset';
}

function refreshCode() {
  if (editId) return;
  const catEl  = document.getElementById('f-category');
  const locEl  = document.getElementById('f-location');
  const codeEl = document.getElementById('f-code');
  if (!catEl || !locEl || !codeEl) return;
  codeEl.value = generateCode(catEl.value.trim() || 'Uncategorised', locEl.value.trim());
}
function refreshCodeT() {
  if (editId) return;
  const catEl  = document.getElementById('ft-category');
  const locEl  = document.getElementById('ft-location');
  const codeEl = document.getElementById('ft-code');
  if (!catEl || !locEl || !codeEl) return;
  codeEl.value = generateCode(catEl.value.trim() || 'Uncategorised', locEl.value.trim());
}

function submitAsset() {
  if (role !== 'admin') return;
  const data = getForm();
  if (!data.name) { flash('f-name'); return; }
  data.category = data.category || 'Uncategorised';
  if (editId) {
    assets = assets.map(a => a.id === editId ? { ...data, id: editId, status: a.status || 'Available', code: a.code, qrCode: a.qrCode } : a);
    editId = null;
  } else {
    data.code = generateCode(data.category, data.location);
    const newAsset = { ...data, id: Date.now(), status: 'Available' };
    assets.push(newAsset);
    // Generate QR code asynchronously
    attachQRToAsset(newAsset).then(() => {
      save(); render(); updateCatFilter();
    });
  }
  save(); clearForm(); cancelForm(); render(); updateCatFilter();
}
function submitAssetT() {
  if (role !== 'admin') return;
  const data = getFormT();
  if (!data.name) { flash('ft-name'); return; }
  data.category = data.category || 'Uncategorised';
  if (editId) {
    assets = assets.map(a => a.id === editId ? { ...data, id: editId, status: a.status || 'Available', code: a.code, qrCode: a.qrCode } : a);
    editId = null;
  } else {
    data.code = generateCode(data.category, data.location);
    const newAsset = { ...data, id: Date.now(), status: 'Available' };
    assets.push(newAsset);
    // Generate QR code asynchronously
    attachQRToAsset(newAsset).then(() => {
      save(); render(); renderTable(); updateCatFilter();
    });
  }
  save(); clearFormT(); cancelFormT(); render(); renderTable(); updateCatFilter();
}

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus(); el.style.borderColor = 'var(--red)';
  setTimeout(() => el.style.borderColor = '', 1200);
}

function editAsset(id) {
  if (role !== 'admin') return;
  const a = assets.find(x => x.id === id);
  if (!a) return;
  editId = id;
  if (currentView === 'table') {
    fillFormT(a);
    const fp = document.getElementById('formPanelT'); if (fp) fp.style.display = '';
    const ft = document.getElementById('formTitleT'); if (ft) ft.textContent = 'Edit Asset';
    const sb = document.getElementById('submitBtnT'); if (sb) sb.textContent = 'Update Asset';
    const addBtn = document.getElementById('addBtn'); if (addBtn) addBtn.textContent = 'Editing…';
    if (fp) fp.scrollIntoView({ behavior: 'smooth' });
  } else {
    fillForm(a);
    const fp = document.getElementById('formPanel');  if (fp) fp.style.display = '';
    const ft = document.getElementById('formTitle');  if (ft) ft.textContent = 'Edit Asset';
    const sb = document.getElementById('submitBtn');  if (sb) sb.textContent = 'Update Asset';
    const addBtn = document.getElementById('addBtn'); if (addBtn) addBtn.textContent = 'Editing…';
    if (fp) fp.scrollIntoView({ behavior: 'smooth' });
  }
}

function deleteAsset(id) {
  if (role !== 'admin') return;
  if (!confirm('Delete this asset?')) return;
  assets = assets.filter(a => a.id !== id);
  save(); render(); renderTable(); updateCatFilter();
}

/* ── CARDS RENDER ──────────────────────────────────────────── */
function render() {
  const container = document.getElementById('assetList');
  if (!container) return;
  if (!assets.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><i class="fas fa-box-open"></i></div><p>No assets yet${role === 'admin' ? ' — click <strong>+ Add Asset</strong> to get started' : ' — no assets have been added yet'}.</p></div>`;
    return;
  }
  const groups = {};
  assets.forEach(a => { const c = a.category || 'Uncategorised'; if (!groups[c]) groups[c] = []; groups[c].push(a); });
  container.innerHTML = Object.keys(groups).map(cat => {
    const cards = groups[cat].map(a => {
      const logs   = getMaintenanceLogs(a.id);
      const today  = new Date();
      const upcomingCount = logs.filter(l => l.type === 'scheduled' && new Date(l.date) >= today).length;
      const overdueCount  = logs.filter(l => l.type === 'scheduled' && new Date(l.date) < today).length;
      const maintIndicator = overdueCount
        ? `<span class="maint-dot overdue-dot" title="${overdueCount} overdue"><i class="fas fa-wrench"></i> ${overdueCount} overdue</span>`
        : upcomingCount
          ? `<span class="maint-dot upcoming-dot" title="${upcomingCount} scheduled"><i class="fas fa-wrench"></i> ${upcomingCount} scheduled</span>`
          : '';
      const img = a.image ? `<img class="asset-img" src="${esc(a.image)}" alt="${esc(a.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
      const ph  = `<div class="asset-img-placeholder" ${a.image ? 'style="display:none"' : ''}><i class="fas fa-box"></i></div>`;
      const actions = role === 'admin'
        ? `<div class="card-actions"><button class="btn-qr" onclick="event.stopPropagation();showQR(${a.id},event)" title="Show QR Code"><i class="fas fa-qrcode"></i></button><button class="btn-edit" onclick="event.stopPropagation();editAsset(${a.id})">Edit</button><button class="btn-del" onclick="event.stopPropagation();deleteAsset(${a.id})">Delete</button></div>`
        : `<div class="card-actions"><button class="btn-qr" onclick="event.stopPropagation();showQR(${a.id},event)" title="Show QR Code"><i class="fas fa-qrcode"></i> QR</button></div>`;
      return `<div class="asset-card" onclick="openDetail(${a.id})">${img}${ph}
        <div class="asset-body">
          <div class="asset-name" title="${esc(a.name)}">${esc(a.name)}</div>
          ${a.code        ? `<div class="asset-code"><i class="fas fa-tag"></i> ${esc(a.code)}</div>` : ''}
          ${a.description ? `<div class="asset-desc">${esc(a.description)}</div>` : ''}
          ${a.location    ? `<div class="asset-location"><i class="fas fa-location-dot"></i> ${esc(a.location)}</div>` : ''}
          ${a.owner       ? `<div class="asset-owner"><i class="fas fa-user"></i> ${esc(a.owner)}</div>` : ''}
          ${maintIndicator}
          <div class="asset-footer"><span class="badge-status">${esc(a.status || 'Available')}</span>${actions}</div>
        </div></div>`;
    }).join('');
    return `<div class="category-section"><div class="category-label"><h2>${esc(cat)}</h2><span class="category-count">${groups[cat].length}</span><div class="category-line"></div></div><div class="asset-grid">${cards}</div></div>`;
  }).join('');
}

/* ── QR CODE ────────────────────────────────────────────────── */

function assetQRUrl(assetId) {
  const base = window.location.href.replace(/\/[^/]*(\?.*)?$/, '');
  return `${base}/guest.html?asset=${assetId}`;
}

// Generate QR code as data URL (base64 PNG)
function generateQRDataURL(assetId, callback) {
  const url = assetQRUrl(assetId);
  const canvas = document.createElement('canvas');
  if (window.QRCode && typeof QRCode.toCanvas === 'function') {
    QRCode.toCanvas(canvas, url, {
      width: 200, margin: 1,
      color: { dark: '#0a1f44', light: '#f8fafc' }
    }, function(err) {
      if (err) {
        console.error('QR generation failed:', err);
        callback(null);
      } else {
        callback(canvas.toDataURL('image/png'));
      }
    });
  } else {
    console.error('QR library not loaded');
    callback(null);
  }
}

// Attach QR code to an asset (async)
function attachQRToAsset(asset) {
  return new Promise((resolve) => {
    generateQRDataURL(asset.id, (qrData) => {
      if (qrData) {
        asset.qrCode = qrData;
      }
      resolve();
    });
  });
}

// Regenerate all QR codes for existing assets
async function regenerateAllQRCodes() {
  const started = Date.now();
  let count = 0;
  for (const asset of assets) {
    await attachQRToAsset(asset);
    count++;
  }
  save();
  console.log(`Regenerated ${count} QR codes in ${Date.now() - started}ms`);
}

function showQR(assetId, event) {
  if (event) event.stopPropagation();
  const a = assets.find(x => x.id === assetId);
  if (!a) return;
  const old = document.getElementById('qrModalOverlay');
  if (old) old.remove();
  const url = assetQRUrl(assetId);
  const overlay = document.createElement('div');
  overlay.className = 'qr-modal-overlay';
  overlay.id = 'qrModalOverlay';
  overlay.innerHTML = `
    <div class="qr-modal">
      <button class="qr-modal-close" onclick="closeQR()" title="Close">&times;</button>
      <div class="qr-modal-label"><i class="fas fa-qrcode"></i> QR Code</div>
      <div class="qr-modal-name">${esc(a.name)}</div>
      <div class="qr-modal-code">${esc(a.code || '\u2014')}</div>
      <div class="qr-canvas-wrap"><canvas id="qrCanvas"></canvas></div>
      <p class="qr-modal-hint">Scan to open <strong>asset details</strong> directly in guest view on any device.</p>
      <button class="btn-qr-download" onclick="downloadQR(${assetId})">
        <i class="fas fa-download"></i> Download QR Code
      </button>
    </div>`;
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeQR(); });
  document.body.appendChild(overlay);
  const canvas = document.getElementById('qrCanvas');
  if (canvas && window.QRCode && typeof QRCode.toCanvas === 'function') {
    QRCode.toCanvas(canvas, url, {
      width: 220, margin: 2,
      color: { dark: '#0a1f44', light: '#f8fafc' }
    }, function(err) { if (err) console.error('QR render error:', err); });
  } else {
    console.error('QR render failed: library not loaded or canvas unavailable.');
  }
}

function closeQR() {
  const overlay = document.getElementById('qrModalOverlay');
  if (overlay) overlay.remove();
}

function downloadQR(assetId) {
  const a = assets.find(x => x.id === assetId);
  const canvas = document.getElementById('qrCanvas');
  if (!canvas || !a) return;
  const link = document.createElement('a');
  link.download = 'QR-' + (a.code || a.name).replace(/[\/\s]/g, '-') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function handleQRDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const assetId = parseInt(params.get('asset'), 10);
  if (!assetId) return;
  const a = assets.find(x => x.id === assetId);
  if (a) openDetail(assetId);
}

/* ── TABLE RENDER ──────────────────────────────────────────── */
function updateCatFilter() {
  const sel = document.getElementById('catFilter');
  if (!sel) return;
  const cur  = sel.value;
  const cats = [...new Set(assets.map(a => a.category || 'Uncategorised'))].sort();
  sel.innerHTML = `<option value="">All Categories</option>` + cats.map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
}
function sortTable(key) {
  if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
  document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  const el = document.getElementById('th-' + key);
  if (el) el.classList.add('sorted');
  renderTable();
}
function renderTable() {
  const searchEl = document.getElementById('tableSearch');
  const catFEl   = document.getElementById('catFilter');
  if (!searchEl || !catFEl) return;
  const search = (searchEl.value || '').toLowerCase();
  const catF   = catFEl.value;
  let filtered = assets.filter(a => {
    const matchCat = !catF || (a.category || 'Uncategorised') === catF;
    const matchS   = !search || [a.name, a.code, a.category, a.location, a.owner, a.department, a.serial, a.specs, a.description].some(v => (v || '').toLowerCase().includes(search));
    return matchCat && matchS;
  });
  filtered.sort((a, b) => {
    const va = String(a[sortKey] || '').toLowerCase(), vb = String(b[sortKey] || '').toLowerCase();
    return va < vb ? -sortDir : va > vb ? sortDir : 0;
  });
  const countEl = document.getElementById('tableCount');
  if (countEl) countEl.textContent = `${filtered.length} of ${assets.length} assets`;
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--muted)">No assets match your filters.</td></tr>`;
    return;
  }
  
  // Group assets by category
  const groups = {};
  filtered.forEach(a => {
    const cat = a.category || 'Uncategorised';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  });
  
  // Render grouped table rows
  const rows = [];
  Object.keys(groups).sort().forEach(category => {
    const catAssets = groups[category];
    
    // Category header row
    rows.push(`<tr class="table-category-header">
      <td colspan="12" class="table-category-cell">
        <div class="table-category-content">
          <i class="fas fa-folder-open"></i>
          <span class="table-category-name">${esc(category)}</span>
          <span class="table-category-count">${catAssets.length} asset${catAssets.length !== 1 ? 's' : ''}</span>
        </div>
      </td>
    </tr>`);
    
    // Asset rows in this category
    catAssets.forEach(a => {
      const logs    = getMaintenanceLogs(a.id);
      const today   = new Date();
      const overdue = logs.filter(l => l.type === 'scheduled' && new Date(l.date) < today).length;
      const upcoming= logs.filter(l => l.type === 'scheduled' && new Date(l.date) >= today).length;
      const maintCell = overdue
        ? `<span class="maint-badge overdue">${overdue} overdue</span>`
        : upcoming
          ? `<span class="maint-badge scheduled">${upcoming} upcoming</span>`
          : `<span style="color:var(--muted);font-size:0.75rem">—</span>`;
      const qrCell = a.qrCode
        ? `<div class="qr-thumbnail" onclick="event.stopPropagation();showQR(${a.id},event)" title="Show QR Code"><img src="${a.qrCode}" alt="QR" style="width:40px;height:40px;border-radius:4px;cursor:pointer;border:1px solid var(--border)"/></div>`
        : `<div class="qr-placeholder" onclick="event.stopPropagation();showQR(${a.id},event)" title="Show QR Code"><i class="fas fa-qrcode" style="color:var(--muted);cursor:pointer"></i></div>`;
      const acts = role === 'admin'
        ? `<div class="td-actions" onclick="event.stopPropagation()"><button class="btn-qr" onclick="showQR(${a.id},event)" title="QR Code"><i class="fas fa-qrcode"></i></button><button class="btn-edit" onclick="editAsset(${a.id})">Edit</button><button class="btn-del" onclick="deleteAsset(${a.id})">Delete</button></div>`
        : `<div class="td-actions" onclick="event.stopPropagation()"><button class="btn-qr" onclick="showQR(${a.id},event)" title="QR Code"><i class="fas fa-qrcode"></i></button></div>`;
      rows.push(`<tr onclick="openDetail(${a.id})">
        <td class="td-code">${esc(a.code || '—')}</td>
        <td class="td-name">${esc(a.name)}</td>
        <td class="td-muted">${esc(a.category || '—')}</td>
        <td class="td-muted">${esc(a.location || '—')}</td>
        <td class="td-muted">${esc(a.owner || '—')}</td>
        <td class="td-muted">${esc(a.department || '—')}</td>
        <td class="td-muted">${esc(a.serial || '—')}</td>
        <td class="td-muted">${a.purchaseDate ? formatDate(a.purchaseDate) : '—'}</td>
        <td>${maintCell}</td>
        <td style="text-align:center">${qrCell}</td>
        <td><span class="badge-status">${esc(a.status || 'Available')}</span></td>
        <td>${acts}</td></tr>`);
    });
  });
  
  tbody.innerHTML = rows.join('');
}

/* ── INITIALIZATION ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  applyRole();
  handleQRDeepLink();
  // Initialize QR codes for existing assets (async, non-blocking)
  if (window.QRCode) {
    setTimeout(() => {
      initializeQRCodes().catch(err => console.error('QR initialization error:', err));
    }, 100);
  }
});
