// Waitlist form handling for the Petyr landing page.
// Both forms (hero + footer) post to /api/waitlist and show inline status.

function wireWaitlistForm(formId, msgId) {
  const form = document.getElementById(formId);
  const msg = document.getElementById(msgId);
  if (!form || !msg) return;

  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (input.value || '').trim();
    if (!email) return;

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Joining…';
    msg.className = 'wl-msg';

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: formId === 'waitlist-form' ? 'hero' : 'footer' }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        msg.textContent = data.already
          ? "You're already on the list — we'll be in touch."
          : "You're in. Petyr will find you when it's time. 🐦";
        msg.className = 'wl-msg ok';
        form.reset();
      } else {
        msg.textContent = data.error || 'Something went wrong — please try again.';
        msg.className = 'wl-msg err';
      }
    } catch {
      msg.textContent = 'Network error — please try again.';
      msg.className = 'wl-msg err';
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}

wireWaitlistForm('waitlist-form', 'wl-msg');
wireWaitlistForm('waitlist-form-foot', 'wl-msg-foot');
