// ============================================================
// TEJOMARG FOUNDATION — Shared Scripts
// ============================================================

(function () {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // Contact form — submits to the form's `action` URL (Formspree by default).
  // While in flight: button shows a spinner. On success: thank-you. On failure:
  // an inline error pointing to the direct mailto link.
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('form-status');
      const error  = document.getElementById('form-error');
      const submit = form.querySelector('.form-submit');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // Reset any prior state
      if (status) status.style.display = 'none';
      if (error)  error.style.display  = 'none';
      submit && submit.classList.add('is-sending');

      // If the form hasn't been wired to a real endpoint yet, fail gracefully.
      const endpoint = form.getAttribute('action') || '';
      if (!endpoint || endpoint.indexOf('REPLACE_WITH_YOUR_FORMSPREE_ID') !== -1) {
        submit && submit.classList.remove('is-sending');
        if (error) {
          error.style.display = 'block';
          error.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        console.warn('Contact form is not yet wired to a delivery service. See contact.html for setup steps.');
        return;
      }

      try {
        const data = new FormData(form);
        const res = await fetch(endpoint, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' },
        });
        submit && submit.classList.remove('is-sending');

        if (res.ok) {
          form.querySelectorAll('input, textarea, select, button').forEach(el => el.disabled = true);
          if (status) {
            status.style.display = 'block';
            status.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          form.reset();
        } else {
          // Try to surface Formspree's own error if available
          let msg = '';
          try {
            const j = await res.json();
            if (j && j.errors && j.errors.length) msg = j.errors.map(e => e.message).join(', ');
          } catch (_) {}
          if (error) {
            error.style.display = 'block';
            if (msg) error.querySelector('strong').textContent = msg;
            error.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } catch (err) {
        submit && submit.classList.remove('is-sending');
        if (error) {
          error.style.display = 'block';
          error.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  // Header subtle shadow on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Cursor-tracking glow for buttons & active nav links
  const trackEls = document.querySelectorAll('.btn, .nav a.active');
  trackEls.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--mx', x + '%');
      el.style.setProperty('--my', y + '%');
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
    });
  });
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          const duration = 1400;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => cio.observe(c));
  }
})();
