// ===========================================================
// DarLink Tunisia — property rendering, filters, pagination
// Now backed by the live API instead of a static array.
// ===========================================================

function formatPrice(price) {
  return price.toLocaleString('fr-FR') + ' ' + t('common.tnd') + t('common.perMonth');
}

function propertyCardHTML(p) {
  const lang = getLang();
  const type = lang === 'en' ? p.type_en : p.type_fr;
  const city = lang === 'en' ? p.city_en : p.city_fr;
  const neigh = lang === 'en' ? p.neighborhood_en : p.neighborhood_fr;
  const desc = lang === 'en' ? p.description_en : p.description_fr;
  const availLabel = p.available_now ? t('common.available') : t('common.unavailable');
  const badgeClass = p.available_now ? '' : 'unavailable';
  const img = (p.images && p.images[0]) || '';

  return `
  <article class="property-card reveal in">
    <a href="bien.html?id=${p.id}" class="media">
      <img src="${img}" alt="${type} - ${city}" loading="lazy">
      <span class="badge ${badgeClass}">${availLabel}</span>
      <span class="price-tag">${formatPrice(p.price)}</span>
    </a>
    <div class="body">
      <h3><a href="bien.html?id=${p.id}">${type} — ${neigh}</a></h3>
      <div class="loc">📍 ${neigh}, ${city}</div>
      <p class="desc">${desc}</p>
      <div class="meta">
        <span>🛏 ${p.bedrooms} ${p.bedrooms > 1 ? t('common.bedrooms') : t('common.bedroom')}</span>
        <span>🚿 ${p.bathrooms} ${t('common.bathrooms')}</span>
        <span>📐 ${p.area} ${t('common.area')}</span>
      </div>
      <a href="bien.html?id=${p.id}" class="btn btn-outline-navy btn-sm btn-block" style="margin-top:10px;">${t('common.viewProperty')}</a>
    </div>
  </article>`;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Request failed: ' + url);
  return res.json();
}

// ---------- Featured (home page) ----------
async function initFeaturedProperties() {
  const el = document.getElementById('featured-grid');
  if (!el) return;
  const render = async () => {
    try {
      const data = await fetchJSON('/api/properties?pageSize=6&page=1');
      if (!data.items.length) {
        el.innerHTML = `<p style="grid-column:1/-1;text-align:center;">${t('properties.empty.title')}</p>`;
        return;
      }
      el.innerHTML = data.items.map(propertyCardHTML).join('');
    } catch (e) {
      el.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--ink-soft);">Impossible de charger les biens pour le moment.</p>`;
    }
  };
  await render();
  document.addEventListener('langchange', render);
}

// ---------- Properties listing page ----------
let currentPage = 1;
const PAGE_SIZE = 9;
let LAST_ITEMS = [];

function buildFilterParams() {
  const params = new URLSearchParams();
  const city = document.getElementById('filter-city')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const price = document.getElementById('filter-price')?.value || '';
  const bedrooms = document.getElementById('filter-bedrooms')?.value || '';
  if (city) params.set('city', city);
  if (type) params.set('type', type);
  if (price) params.set('maxPrice', price);
  if (bedrooms) params.set('minBedrooms', bedrooms);
  params.set('page', currentPage);
  params.set('pageSize', PAGE_SIZE);
  return params;
}

async function populateFilterOptions() {
  const citySel = document.getElementById('filter-city');
  const typeSel = document.getElementById('filter-type');
  if (!citySel || !typeSel) return;

  let meta;
  try {
    meta = await fetchJSON('/api/properties/meta');
  } catch (e) {
    return;
  }

  const lang = getLang();
  const prevCity = citySel.value;
  const prevType = typeSel.value;

  citySel.innerHTML = `<option value="">${t('properties.filter.all')}</option>` +
    meta.cities.map(c => `<option value="${c.fr}">${lang === 'en' ? c.en : c.fr}</option>`).join('');

  typeSel.innerHTML = `<option value="">${t('properties.filter.allTypes')}</option>` +
    meta.types.map(ty => `<option value="${ty.fr}">${lang === 'en' ? ty.en : ty.fr}</option>`).join('');

  citySel.value = prevCity;
  typeSel.value = prevType;
}

async function renderPropertiesList() {
  const grid = document.getElementById('properties-grid');
  const countEl = document.getElementById('results-count');
  const paginationEl = document.getElementById('pagination');
  if (!grid) return;

  grid.setAttribute('aria-busy', 'true');

  let data;
  try {
    data = await fetchJSON('/api/properties?' + buildFilterParams().toString());
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Impossible de charger les biens. Vérifiez que le serveur est démarré.</div>`;
    return;
  }

  LAST_ITEMS = data.items;
  if (currentPage > data.totalPages) currentPage = data.totalPages;

  if (countEl) countEl.textContent = `${data.total} ${t('properties.results.count')}`;

  if (data.items.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <h3>${t('properties.empty.title')}</h3>
      <p>${t('properties.empty.text')}</p>
    </div>`;
  } else {
    grid.innerHTML = data.items.map(propertyCardHTML).join('');
  }

  if (paginationEl) {
    paginationEl.innerHTML = '';
    if (data.totalPages > 1) {
      for (let i = 1; i <= data.totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => {
          currentPage = i;
          renderPropertiesList();
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        paginationEl.appendChild(btn);
      }
    }
  }
}

async function initPropertiesPage() {
  const grid = document.getElementById('properties-grid');
  if (!grid) return;

  await populateFilterOptions();

  const params = new URLSearchParams(window.location.search);
  ['city', 'type', 'price', 'bedrooms'].forEach(key => {
    const val = params.get(key);
    const field = document.getElementById(`filter-${key}`);
    if (val && field) field.value = val;
  });

  ['filter-city', 'filter-type', 'filter-price', 'filter-bedrooms'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      currentPage = 1;
      renderPropertiesList();
    });
  });

  document.getElementById('filter-reset')?.addEventListener('click', () => {
    ['filter-city', 'filter-type', 'filter-price', 'filter-bedrooms'].forEach(id => {
      const f = document.getElementById(id);
      if (f) f.value = '';
    });
    currentPage = 1;
    renderPropertiesList();
  });

  await renderPropertiesList();

  document.addEventListener('langchange', async () => {
    await populateFilterOptions();
    renderPropertiesList();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFeaturedProperties();
  initPropertiesPage();
});
