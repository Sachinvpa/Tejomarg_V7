// ============================================================
// TEJOMARG FOUNDATION — Motion module (v2)
// Restrained, premium motion appropriate for an institutional
// foundation site. Effects are tasteful and GPU-friendly;
// nothing decorative for its own sake. Fully honours
// prefers-reduced-motion.
// ============================================================

(function () {
  const docEl = document.documentElement;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Signal to CSS that JS-driven motion is available.
  docEl.classList.add('tm-js');

  // ============================================================
  // 1. READING PROGRESS BAR (top of page, gradient orange)
  // ============================================================
  (function progressBar() {
    const bar = document.createElement('div');
    bar.id = 'tm-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<div class="tm-progress-fill"></div>';
    document.body.appendChild(bar);

    const fill = bar.querySelector('.tm-progress-fill');
    let ticking = false;
    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      fill.style.transform = `scaleX(${p})`;
      ticking = false;
    };
    update();
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', update);
  })();

  // ============================================================
  // 2. BACK-TO-TOP CONTROL (appears after a screenful of scroll)
  // ============================================================
  (function backToTop() {
    const btn = document.createElement('button');
    btn.className = 'tm-totop';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="6 14 12 8 18 14"/></svg>';
    document.body.appendChild(btn);

    const onScroll = () => {
      btn.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.9);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  })();

  // Reduced-motion users get the progress bar + back-to-top only.
  if (reduce) return;

  // ============================================================
  // 4. STAGGERED REVEALS
  //    Consecutive .reveal items that share a parent and have no
  //    explicit [data-delay] get an automatic cascade. Split,
  //    two-column layouts also pick up a gentle directional slide.
  // ============================================================
  (function staggerReveals() {
    const groups = new Map();
    document.querySelectorAll('.reveal:not([data-delay])').forEach(el => {
      const parent = el.parentElement;
      if (!parent) return;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach(items => {
      if (items.length < 2) return;
      items.forEach((el, i) => {
        el.style.setProperty('--reveal-delay', (Math.min(i, 6) * 0.09) + 's');
      });
    });

    // Directional entrances for known split layouts (no markup edits).
    const slideLeft = ['.contact-info', '.governance > div:first-child'];
    const slideRight = ['.contact-form-wrap'];
    slideLeft.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      const r = el.closest('.reveal') || (el.classList.contains('reveal') ? el : null);
      if (r) r.classList.add('tm-from-left');
    }));
    slideRight.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      const r = el.closest('.reveal') || (el.classList.contains('reveal') ? el : null);
      if (r) r.classList.add('tm-from-right');
    }));
  })();

  // ============================================================
  // 5. WORD-BY-WORD HEADLINE REVEAL (page hero h1 only)
  // ============================================================
  (function headlineReveal() {
    const targets = document.querySelectorAll('.hero h1, .page-hero h1, .initiatives-hero h1, .impact-hero h1, .about-hero h1, .contact-hero h1, .legal-hero h1, .wed-hero h1');
    targets.forEach(h => {
      const walk = (node) => {
        const out = [];
        Array.from(node.childNodes).forEach(c => {
          if (c.nodeType === Node.TEXT_NODE) {
            const parts = c.textContent.split(/(\s+)/);
            parts.forEach(p => {
              if (!p) return;
              if (/^\s+$/.test(p)) {
                out.push(document.createTextNode(p));
              } else {
                const s = document.createElement('span');
                s.className = 'tm-word';
                s.textContent = p;
                out.push(s);
              }
            });
          } else if (c.nodeType === Node.ELEMENT_NODE) {
            const cs = getComputedStyle(c);
            const isGradientText = cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)'
              || c.classList.contains('accent');
            if (isGradientText) {
              const s = document.createElement('span');
              s.className = 'tm-word';
              s.appendChild(c.cloneNode(true));
              out.push(s);
            } else {
              const wrapped = walk(c);
              c.innerHTML = '';
              wrapped.forEach(w => c.appendChild(w));
              out.push(c);
            }
          } else {
            out.push(c);
          }
        });
        return out;
      };
      const wrapped = walk(h);
      h.innerHTML = '';
      wrapped.forEach(w => h.appendChild(w));

      const words = h.querySelectorAll('.tm-word');
      words.forEach((w, i) => {
        w.style.setProperty('--d', (i * 0.07) + 's');
      });
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('tm-reveal-in');
              io.unobserve(e.target);
            }
          });
        }, { threshold: 0.2 });
        io.observe(h);
      } else {
        h.classList.add('tm-reveal-in');
      }
    });
  })();

  // ============================================================
  // 6. IMAGE ENTRANCE
  //    Images intentionally use NO per-image hide/observer — that
  //    proved fragile (clipped elements + display:none tab panels
  //    can fail to un-hide, leaving images invisible). Instead, the
  //    programme / featured / feature-card blocks are already
  //    `.reveal` containers, so their images fade up with the block
  //    via the shared (reliable) reveal observer in scripts.js.
  //    This guarantees images are always visible.
  // ============================================================

  // ============================================================
  // 7. CURSOR-FOLLOWING SPOTLIGHT ON CARDS
  //    Soft warm light tracks the pointer — depth without movement.
  // ============================================================
  (function cardSpotlight() {
    const cards = document.querySelectorAll(
      '.diff-item, .report-card, .leader-card, .net-cell, .voice-card, .feature-card'
    );
    if (!cards.length) return;
    // Pointer-fine devices only — avoids sticky :hover on touch.
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

    cards.forEach(card => {
      card.classList.add('tm-spotlight');
      let raf = null, lastX = 50, lastY = 0;
      const apply = () => {
        card.style.setProperty('--sx', lastX + '%');
        card.style.setProperty('--sy', lastY + '%');
        raf = null;
      };
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        lastX = ((e.clientX - r.left) / r.width) * 100;
        lastY = ((e.clientY - r.top) / r.height) * 100;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      card.addEventListener('pointerenter', () => card.classList.add('tm-glow'));
      card.addEventListener('pointerleave', () => card.classList.remove('tm-glow'));
    });
  })();

  // ============================================================
  // 8. 3D POINTER TILT ON DARK PANELS
  // ============================================================
  (function panelTilt() {
    const panels = document.querySelectorAll('.hero-panel');
    if (!panels.length) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
    const MAX = 5; // degrees — deliberately gentle

    panels.forEach(panel => {
      panel.classList.add('tm-tilt');
      let raf = null, rx = 0, ry = 0;
      const apply = () => {
        panel.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
        panel.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
        raf = null;
      };
      panel.addEventListener('pointermove', (e) => {
        const r = panel.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry = px * MAX * 2;
        rx = -py * MAX * 2;
        panel.classList.add('tm-tilting');
        if (!raf) raf = requestAnimationFrame(apply);
      });
      panel.addEventListener('pointerleave', () => {
        rx = 0; ry = 0;
        panel.classList.remove('tm-tilting');
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  })();

  // ============================================================
  // 9. SECTION PARALLAX (subtle background drift on scroll)
  // ============================================================
  (function parallax() {
    const layers = document.querySelectorAll('.hero, .page-hero, .impact-hero, .about-hero, .contact-hero, .initiatives-hero, .featured, .feature-card, .wed-hero');
    if (!layers.length) return;

    let ticking = false;
    const update = () => {
      layers.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
        const offset = (r.top * 0.06).toFixed(1);
        el.style.setProperty('--tm-parallax', offset + 'px');
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  // ============================================================
  // 10. AMBIENT FLOATING DOTS in the dark hero panel
  // ============================================================
  (function ambientDots() {
    const panels = document.querySelectorAll('.hero-panel');
    panels.forEach(panel => {
      const layer = document.createElement('div');
      layer.className = 'tm-dots';
      layer.setAttribute('aria-hidden', 'true');
      const N = 6;
      for (let i = 0; i < N; i++) {
        const d = document.createElement('span');
        d.className = 'tm-dot';
        d.style.setProperty('--x', (10 + Math.random() * 80) + '%');
        d.style.setProperty('--y', (10 + Math.random() * 80) + '%');
        d.style.setProperty('--s', (1 + Math.random() * 2.2).toFixed(2) + 'px');
        d.style.setProperty('--del', (Math.random() * 4).toFixed(1) + 's');
        d.style.setProperty('--dur', (8 + Math.random() * 8).toFixed(1) + 's');
        d.style.setProperty('--amp', (10 + Math.random() * 18).toFixed(1) + 'px');
        layer.appendChild(d);
      }
      panel.appendChild(layer);
    });
  })();

})();
