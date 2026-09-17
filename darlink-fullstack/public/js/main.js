// ===========================================================
// DarLink Tunisia — shared behaviour (nav, lang switch, footer)
// ===========================================================
const WHATSAPP_NUMBER = "21698607356";
const CONTACT_PHONE_DISPLAY = "+216 98 607 356";
const CONTACT_EMAIL = "contact@darlinktunisia.com";

function whatsappLink(message) {
  const msg = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${WHATSAPP_NUMBER}${msg}`;
}

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  // Language switch buttons
  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang')));
  });

  // Highlight active nav link based on current page
  const page = document.body.getAttribute('data-page');
  if (page) {
    document.querySelectorAll(`.main-nav a[data-page]`).forEach(a => {
      if (a.getAttribute('data-page') === page) a.classList.add('active');
    });
  }

  // Footer year
  document.querySelectorAll('.footer-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // WhatsApp float + header buttons
  document.querySelectorAll('[data-whatsapp]').forEach(el => {
    const msg = el.getAttribute('data-whatsapp') || "Bonjour DarLink Tunisia, j'aimerais avoir plus d'informations.";
    el.setAttribute('href', whatsappLink(msg));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  // Fill in contact placeholders
  document.querySelectorAll('[data-phone-display]').forEach(el => el.textContent = CONTACT_PHONE_DISPLAY);
  document.querySelectorAll('[data-email-display]').forEach(el => {
    el.textContent = CONTACT_EMAIL;
    if (el.tagName === 'A') el.setAttribute('href', `mailto:${CONTACT_EMAIL}`);
  });
  document.querySelectorAll('a[data-phone-link]').forEach(el => el.setAttribute('href', `tel:${CONTACT_PHONE_DISPLAY.replace(/\s+/g,'')}`));

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }
});
