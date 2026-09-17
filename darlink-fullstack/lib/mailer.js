// ===========================================================
// DarLink Tunisia — optional email notifications
// If SMTP_HOST/SMTP_USER/SMTP_PASS are set in the environment,
// a new contact-form lead triggers a real email to NOTIFY_EMAIL.
// If not configured, this is a silent no-op — leads are still
// safely stored in the database and visible in /admin.
// ===========================================================
const nodemailer = require('nodemailer');

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

async function maybeSendNotification(lead) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };

  const to = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
  const propertyLine = lead.propertyId ? `\nBien concerné : #${lead.propertyId}` : '';

  await t.sendMail({
    from: `"DarLink Tunisia — Site web" <${process.env.SMTP_USER}>`,
    to,
    replyTo: lead.email,
    subject: `[Nouveau message] ${lead.subject}`,
    text: `Nouveau message reçu via le site :\n\nNom : ${lead.name}\nTéléphone : ${lead.phone}\nEmail : ${lead.email}${propertyLine}\n\nMessage :\n${lead.message}`
  });

  return { sent: true };
}

module.exports = { maybeSendNotification, isConfigured };
