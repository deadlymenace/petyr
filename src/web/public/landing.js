// Waitlist form handling for the Petyr landing page.
// Every waitlist form posts to /api/waitlist and shows inline status.
// Optional context controls (interest chips, region) may sit inside the form
// or point at it with form="<id>"; they are only sent when filled in.

function readSignupContext(form) {
  const fields = Array.from(form.elements);
  const interests = fields.filter((el) => el.name === 'interest' && el.checked).map((el) => el.value);
  const region = fields.find((el) => el.name === 'region' && el.checked);
  return {
    ...(interests.length ? { interests } : {}),
    ...(region ? { region: region.value } : {}),
  };
}

function wireWaitlistForm(formId, msgId) {
  const form = document.getElementById(formId);
  const msg = document.getElementById(msgId);
  if (!form || !msg) return;

  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const source = form.dataset.source || (formId === 'waitlist-form' ? 'hero' : 'footer');

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
        body: JSON.stringify({ email, source, ...readSignupContext(form) }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        msg.textContent = data.already
          ? "You're already on the list — we'll be in touch."
          : "You're in. Petyr will find you when it's time. 🐦";
        msg.className = 'wl-msg ok';
        form.reset();
        // Lets a page play its own success moment (see concepts/*.js)
        document.dispatchEvent(new CustomEvent('petyr:waitlist-joined', {
          detail: { formId, already: Boolean(data.already) },
        }));
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
