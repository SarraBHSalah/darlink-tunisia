// ===========================================================
// DarLink Tunisia — admin dashboard logic
// ===========================================================
let PROPERTIES_CACHE = [];
let LEADS_CACHE = [];

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });
  if (res.status === 401) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ---------- Auth / init ----------
async function checkAuth() {
  const data = await api('/api/admin/me');
  if (!data.authenticated) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('who-username').textContent = data.username;
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  window.location.href = 'login.html';
});

// ---------- Tabs ----------
document.querySelectorAll('.admin-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// ---------- Properties ----------
async function loadProperties() {
  PROPERTIES_CACHE = await api('/api/admin/properties');
  document.getElementById('count-properties').textContent = PROPERTIES_CACHE.length;
  const tbody = document.getElementById('properties-tbody');
  if (PROPERTIES_CACHE.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Aucun bien pour le moment.</td></tr>`;
    return;
  }
  tbody.innerHTML = PROPERTIES_CACHE
    .slice()
    .sort((a, b) => b.id - a.id)
    .map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>${p.type_fr}</td>
      <td>${p.city_fr}</td>
      <td>${p.neighborhood_fr || '-'}</td>
      <td>${p.price} TND</td>
      <td>${p.bedrooms}</td>
      <td><span class="pill ${p.available_now ? 'available' : 'unavailable'}">${p.available_now ? 'Disponible' : 'Occupé'}</span></td>
      <td class="row-actions">
        <button data-edit="${p.id}">Modifier</button>
        <button data-delete="${p.id}" class="danger">Supprimer</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openPropertyModal(parseInt(b.dataset.edit, 10))));
  tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteProperty(parseInt(b.dataset.delete, 10))));
}

// ---------- Photo upload ----------
let currentImages = [];

function renderPhotoThumbs() {
  const wrap = document.getElementById('photo-thumbs');
  wrap.innerHTML = currentImages.map((url, i) => `
    <div class="photo-thumb">
      <img src="${url}" alt="Photo ${i + 1}">
      <button type="button" class="remove-photo" data-remove-url="${url}" title="Retirer">×</button>
    </div>`).join('');

  wrap.querySelectorAll('[data-remove-url]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.dataset.removeUrl;
      currentImages = currentImages.filter(u => u !== url);
      renderPhotoThumbs();
      // Best-effort cleanup on the server; harmless if it fails or the
      // file is reused elsewhere.
      try {
        await api('/api/admin/upload', { method: 'DELETE', body: JSON.stringify({ url }) });
      } catch (e) { /* non-critical */ }
    });
  });
}

async function uploadPhotoFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const statusEl = document.getElementById('upload-status');
  statusEl.textContent = `Envoi de ${files.length} photo(s)...`;

  const formData = new FormData();
  files.forEach(f => formData.append('photos', f));

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Échec du téléversement.');
    currentImages = currentImages.concat(data.urls);
    renderPhotoThumbs();
    statusEl.textContent = `${data.urls.length} photo(s) ajoutée(s).`;
  } catch (err) {
    statusEl.textContent = '';
    showToast(err.message, true);
  }
}

document.getElementById('btn-choose-photos').addEventListener('click', () => {
  document.getElementById('p-photo-input').click();
});
document.getElementById('p-photo-input').addEventListener('change', (e) => {
  uploadPhotoFiles(e.target.files);
  e.target.value = ''; // allow re-selecting the same file later
});

// Drag & drop support
const dropZone = document.getElementById('photo-drop-zone');
['dragover', 'dragenter'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
});
['dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.style.borderColor = ''; });
});
dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer?.files?.length) uploadPhotoFiles(e.dataTransfer.files);
});

function openPropertyModal(id) {
  const modal = document.getElementById('property-modal');
  const form = document.getElementById('property-form');
  form.reset();
  document.getElementById('p-id').value = '';
  document.getElementById('modal-title').textContent = id ? `Modifier le bien #${id}` : 'Ajouter un bien';
  document.getElementById('upload-status').textContent = '';
  currentImages = [];

  if (id) {
    const p = PROPERTIES_CACHE.find(x => x.id === id);
    if (p) {
      document.getElementById('p-id').value = p.id;
      const fields = ['type_fr','type_en','city_fr','city_en','neighborhood_fr','neighborhood_en',
        'price','bedrooms','bathrooms','area','floor_fr','floor_en','availability_fr','availability_en',
        'description_fr','description_en','full_description_fr','full_description_en','address_fr','address_en'];
      fields.forEach(f => {
        const el = document.getElementById('p-' + f);
        if (el) el.value = p[f] ?? '';
      });
      document.getElementById('p-available_now').value = String(!!p.available_now);
      document.getElementById('p-features_fr').value = (p.features_fr || []).join(', ');
      document.getElementById('p-features_en').value = (p.features_en || []).join(', ');
      currentImages = (p.images || []).slice();
    }
  } else {
    document.getElementById('p-available_now').value = 'true';
  }

  renderPhotoThumbs();
  modal.classList.add('open');
}

function closePropertyModal() {
  document.getElementById('property-modal').classList.remove('open');
}

document.getElementById('btn-add-property').addEventListener('click', () => openPropertyModal(null));
document.getElementById('btn-cancel-modal').addEventListener('click', closePropertyModal);

document.getElementById('property-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const payload = {
    type_fr: document.getElementById('p-type_fr').value,
    type_en: document.getElementById('p-type_en').value,
    city_fr: document.getElementById('p-city_fr').value,
    city_en: document.getElementById('p-city_en').value,
    neighborhood_fr: document.getElementById('p-neighborhood_fr').value,
    neighborhood_en: document.getElementById('p-neighborhood_en').value,
    price: document.getElementById('p-price').value,
    bedrooms: document.getElementById('p-bedrooms').value,
    bathrooms: document.getElementById('p-bathrooms').value,
    area: document.getElementById('p-area').value,
    floor_fr: document.getElementById('p-floor_fr').value,
    floor_en: document.getElementById('p-floor_en').value,
    availability_fr: document.getElementById('p-availability_fr').value,
    availability_en: document.getElementById('p-availability_en').value,
    available_now: document.getElementById('p-available_now').value === 'true',
    description_fr: document.getElementById('p-description_fr').value,
    description_en: document.getElementById('p-description_en').value,
    full_description_fr: document.getElementById('p-full_description_fr').value,
    full_description_en: document.getElementById('p-full_description_en').value,
    features_fr: document.getElementById('p-features_fr').value,
    features_en: document.getElementById('p-features_en').value,
    images: currentImages,
    address_fr: document.getElementById('p-address_fr').value,
    address_en: document.getElementById('p-address_en').value
  };

  try {
    if (id) {
      await api(`/api/admin/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Bien mis à jour.');
    } else {
      await api('/api/admin/properties', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Bien ajouté.');
    }
    closePropertyModal();
    loadProperties();
  } catch (err) {
    showToast(err.message, true);
  }
});

async function deleteProperty(id) {
  if (!confirm(`Supprimer définitivement le bien #${id} ?`)) return;
  try {
    await api(`/api/admin/properties/${id}`, { method: 'DELETE' });
    showToast('Bien supprimé.');
    loadProperties();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- Leads ----------
async function loadLeads() {
  LEADS_CACHE = await api('/api/admin/leads');
  document.getElementById('count-leads').textContent = LEADS_CACHE.filter(l => l.status === 'new').length;
  const tbody = document.getElementById('leads-tbody');
  if (LEADS_CACHE.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Aucun message pour le moment.</td></tr>`;
    return;
  }
  tbody.innerHTML = LEADS_CACHE.map(l => `
    <tr>
      <td>${new Date(l.createdAt).toLocaleString('fr-FR')}</td>
      <td>${escapeHtml(l.name)}</td>
      <td>${escapeHtml(l.phone)}</td>
      <td>${escapeHtml(l.email)}</td>
      <td class="wrap">${escapeHtml(l.subject)}</td>
      <td class="wrap">${escapeHtml(l.message)}</td>
      <td>
        <select data-status="${l.id}">
          <option value="new" ${l.status === 'new' ? 'selected' : ''}>Nouveau</option>
          <option value="read" ${l.status === 'read' ? 'selected' : ''}>Lu</option>
          <option value="archived" ${l.status === 'archived' ? 'selected' : ''}>Archivé</option>
        </select>
      </td>
      <td class="row-actions">
        <button data-delete-lead="${l.id}" class="danger">Supprimer</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-status]').forEach(sel => {
    sel.addEventListener('change', async () => {
      await api(`/api/admin/leads/${sel.dataset.status}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
      showToast('Statut mis à jour.');
      loadLeads();
    });
  });
  tbody.querySelectorAll('[data-delete-lead]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('Supprimer ce message ?')) return;
      await api(`/api/admin/leads/${b.dataset.deleteLead}`, { method: 'DELETE' });
      showToast('Message supprimé.');
      loadLeads();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---------- Settings ----------
document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  try {
    await api('/api/admin/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    showToast('Mot de passe mis à jour.');
    e.target.reset();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Init ----------
(async function init() {
  await checkAuth();
  await Promise.all([loadProperties(), loadLeads()]);
})();
