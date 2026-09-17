// ===========================================================
// DarLink Tunisia — property detail page rendering (live API)
// ===========================================================

function getPropertyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  return Number.isFinite(id) ? id : null;
}

let CURRENT_PROPERTY = null;

async function renderPropertyDetail() {
  const root = document.getElementById('property-detail');
  if (!root) return;

  const id = getPropertyIdFromUrl();
  if (!CURRENT_PROPERTY || CURRENT_PROPERTY.id !== id) {
    root.innerHTML = `<p style="text-align:center;padding:60px 0;">Chargement...</p>`;
    try {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error('not found');
      CURRENT_PROPERTY = await res.json();
    } catch (e) {
      root.innerHTML = `<div class="empty-state"><h3>Bien introuvable</h3><p><a href="biens.html">${t('detail.breadcrumb')}</a></p></div>`;
      return;
    }
  }

  const property = CURRENT_PROPERTY;
  const lang = getLang();

  const type = lang === 'en' ? property.type_en : property.type_fr;
  const city = lang === 'en' ? property.city_en : property.city_fr;
  const neigh = lang === 'en' ? property.neighborhood_en : property.neighborhood_fr;
  const fullDesc = lang === 'en' ? property.full_description_en : property.full_description_fr;
  const address = lang === 'en' ? property.address_en : property.address_fr;
  const availability = lang === 'en' ? property.availability_en : property.availability_fr;
  const floor = lang === 'en' ? property.floor_en : property.floor_fr;
  const features = (lang === 'en' ? property.features_en : property.features_fr) || [];
  const imgs = property.images && property.images.length ? property.images : [''];

  document.title = `${type} — ${neigh}, ${city} | DarLink Tunisia`;

  const galleryHTML = `
    <div class="gallery">
      <div class="main-img"><img id="main-gallery-img" src="${imgs[0]}" alt="${type} ${neigh}"></div>
      ${imgs.slice(1, 4).map((src, i) => `<div class="thumb" data-src="${src}"><img src="${src}" alt="${type} photo ${i+2}"></div>`).join('')}
    </div>`;

  const availClass = property.available_now ? '' : 'no';
  const availLabel = property.available_now ? t('common.available') : t('common.unavailable');

  const waMsg = lang === 'en'
    ? `Hello, I'm interested in the property: ${type} - ${neigh}, ${city} (ref #${property.id}).`
    : `Bonjour, je suis intéressé(e) par le bien : ${type} - ${neigh}, ${city} (réf #${property.id}).`;

  root.innerHTML = `
    <div class="breadcrumb">
      <a href="biens.html">${t('detail.breadcrumb')}</a> / ${type} — ${neigh}
    </div>
    ${galleryHTML}
    <div class="detail-grid">
      <div>
        <span class="eyebrow">${city} · ${neigh}</span>
        <h1>${type} — ${neigh}, ${city}</h1>
        <div class="loc">📍 ${address}</div>

        <div class="char-list">
          <div class="char-item"><div class="k">${t('detail.charType')}</div><div class="v">${type}</div></div>
          <div class="char-item"><div class="k">${t('detail.charBedrooms')}</div><div class="v">${property.bedrooms}</div></div>
          <div class="char-item"><div class="k">${t('detail.charBathrooms')}</div><div class="v">${property.bathrooms}</div></div>
          <div class="char-item"><div class="k">${t('detail.charArea')}</div><div class="v">${property.area} ${t('common.area')}</div></div>
          <div class="char-item"><div class="k">${t('detail.charFloor')}</div><div class="v">${floor}</div></div>
          <div class="char-item"><div class="k">${t('detail.charAvailability')}</div><div class="v">${availability}</div></div>
        </div>

        <h3>${t('detail.description')}</h3>
        <p>${fullDesc}</p>

        <h3>${t('detail.equipment')}</h3>
        <div class="tag-list">
          ${features.map(f => `<span class="tag">${f}</span>`).join('')}
        </div>

        <h3>${t('detail.location')}</h3>
        <div class="map-box">
          <iframe loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(city + ' Tunisia')}&z=13&output=embed"></iframe>
        </div>
      </div>

      <div>
        <div class="sticky-card">
          <div class="price">${formatPrice(property.price)}</div>
          <div class="avail ${availClass}"><span class="dot"></span> ${availLabel}</div>
          <p style="font-weight:600;color:var(--navy);margin-bottom:16px;">${t('detail.contactPrompt')}</p>
          <a href="${whatsappLink(waMsg)}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-block" style="margin-bottom:10px;">${t('common.viewOnWhatsapp')}</a>
          <a href="contact.html?property=${property.id}" class="btn btn-outline-navy btn-block">${t('common.contactUs')}</a>
        </div>
      </div>
    </div>

    <div id="similar-wrap"></div>
  `;

  root.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.getElementById('main-gallery-img').src = thumb.getAttribute('data-src');
    });
  });

  // Similar properties (same city, different id)
  try {
    const res = await fetch(`/api/properties?city=${encodeURIComponent(property.city_fr)}&pageSize=6`);
    const data = await res.json();
    const similar = data.items.filter(p => p.id !== property.id).slice(0, 3);
    if (similar.length) {
      document.getElementById('similar-wrap').innerHTML = `
        <h3 style="margin-top:64px;">${t('detail.similar')}</h3>
        <div class="grid grid-3">${similar.map(propertyCardHTML).join('')}</div>`;
    }
  } catch (e) { /* non-critical */ }
}

document.addEventListener('DOMContentLoaded', renderPropertyDetail);
document.addEventListener('langchange', renderPropertyDetail);
