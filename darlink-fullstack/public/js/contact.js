// ===========================================================
// DarLink Tunisia — contact form handling (submits to /api/contact)
// ===========================================================
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Pre-fill subject if arriving from a property detail page
  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get('property');
  if (propertyId) {
    try {
      const res = await fetch(`/api/properties/${propertyId}`);
      if (res.ok) {
        const property = await res.json();
        const subjectField = document.getElementById('field-subject');
        const messageField = document.getElementById('field-message');
        const lang = getLang();
        const type = lang === 'en' ? property.type_en : property.type_fr;
        const neigh = lang === 'en' ? property.neighborhood_en : property.neighborhood_fr;
        if (subjectField) {
          subjectField.value = lang === 'en'
            ? `Interested in: ${type} - ${neigh} (ref #${property.id})`
            : `Intéressé(e) par : ${type} - ${neigh} (réf #${property.id})`;
        }
        if (messageField) {
          messageField.value = lang === 'en'
            ? `Hello, I'd like more information about this property (ref #${property.id}).`
            : `Bonjour, je souhaite obtenir plus d'informations sur ce bien (réf #${property.id}).`;
        }
      }
    } catch (e) { /* non-critical prefill */ }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const successBox = document.getElementById('form-success');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    const payload = {
      name: document.getElementById('field-name').value,
      phone: document.getElementById('field-phone').value,
      email: document.getElementById('field-email').value,
      subject: document.getElementById('field-subject').value,
      message: document.getElementById('field-message').value,
      propertyId: propertyId || null
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (successBox) {
          successBox.classList.remove('error');
          successBox.classList.add('show');
          successBox.textContent = t('contact.form.success');
          successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        form.reset();
      } else {
        if (successBox) {
          successBox.classList.add('show', 'error');
          successBox.textContent = data.error || 'Une erreur est survenue. Veuillez réessayer.';
          successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } catch (err) {
      if (successBox) {
        successBox.classList.add('show', 'error');
        successBox.textContent = "Impossible d'envoyer le message. Vérifiez votre connexion.";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
});
