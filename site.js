const mobileMenus = [...document.querySelectorAll('.site-mobile-menu')];

let scrollUpdatePending = false;
const updateHeaderDepth = () => {
  document.body.classList.toggle('site-scrolled', window.scrollY > 16);
  scrollUpdatePending = false;
};
updateHeaderDepth();
window.addEventListener('scroll', () => {
  if (scrollUpdatePending) return;
  scrollUpdatePending = true;
  requestAnimationFrame(updateHeaderDepth);
}, { passive: true });

if (window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
  const hero = document.querySelector('.site-home main section:first-child, .site-events main section:first-child');
  if (hero) {
    let frame = 0;
    hero.addEventListener('pointermove', event => {
      if (frame) return;
      const x = event.clientX;
      const y = event.clientY;
      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--hero-x', `${((x - rect.left) / rect.width) * 100}%`);
        hero.style.setProperty('--hero-y', `${((y - rect.top) / rect.height) * 100}%`);
        frame = 0;
      });
    });
    hero.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      hero.style.removeProperty('--hero-x');
      hero.style.removeProperty('--hero-y');
    });
  }
}

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const pendingReveals = new Set();
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('site-reveal-visible');
      revealObserver.unobserve(entry.target);
      pendingReveals.delete(entry.target);
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  const queueReveal = (element, delay = 0, section = false) => {
    if (element.getBoundingClientRect().top < window.innerHeight * .88) return;
    if (section) element.classList.add('site-section-reveal');
    element.style.setProperty('--site-reveal-delay', `${delay}ms`);
    element.classList.add('site-reveal-pending');
    pendingReveals.add(element);
    revealObserver.observe(element);
  };

  document.querySelectorAll('main section:not(:first-child)').forEach(section => queueReveal(section, 0, true));
  document.querySelectorAll('main section h2').forEach(heading => queueReveal(heading, 40));
  [
    '.site-home .site-method-card',
    '.site-home .site-plan',
    '.site-home #ecosistema div.group',
    '.site-home .site-social-frame',
    '.site-team-card',
    '.site-cine-card',
    '.site-phase-card',
    '.site-pillar'
  ].forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => queueReveal(element, Math.min(index * 85, 255)));
  });

  let revealCatchUpPending = false;
  window.addEventListener('scroll', () => {
    if (revealCatchUpPending || !pendingReveals.size) return;
    revealCatchUpPending = true;
    requestAnimationFrame(() => {
      for (const element of pendingReveals) {
        if (element.getBoundingClientRect().bottom >= 0) continue;
        element.classList.add('site-reveal-visible');
        revealObserver.unobserve(element);
        pendingReveals.delete(element);
      }
      revealCatchUpPending = false;
    });
  }, { passive: true });
}

document.addEventListener('pointerdown', event => {
  for (const menu of mobileMenus) {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  for (const menu of mobileMenus) {
    if (menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  }
});

const whatsappFloat = document.querySelector('.site-whatsapp-float');
if (whatsappFloat) {
  const visibleContactAreas = new Set();
  const nearbyControls = [...document.querySelectorAll('main a, main button, footer a, footer button')];
  const nearbyMedia = [...document.querySelectorAll('main img, main [role="img"], footer img')];
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.trim() && node.parentElement?.closest('main, footer')) textNodes.push(node);
  }

  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const textRange = document.createRange();
  const mobileViewport = window.matchMedia('(max-width: 767px)');
  let floatUpdatePending = false;
  const updateFloat = () => {
    floatUpdatePending = false;
    if (mobileViewport.matches) {
      whatsappFloat.classList.remove('is-obscured');
      whatsappFloat.tabIndex = 0;
      return;
    }
    const rect = whatsappFloat.getBoundingClientRect();
    const area = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    let obstructed = visibleContactAreas.size > 0 || nearbyControls.some(el => intersects(el.getBoundingClientRect(), area))
      || nearbyMedia.some(el => intersects(el.getBoundingClientRect(), area));

    if (!obstructed) {
      for (const node of textNodes) {
        if (!intersects(node.parentElement.getBoundingClientRect(), area)) continue;
        textRange.selectNodeContents(node);
        if ([...textRange.getClientRects()].some(rect => intersects(rect, area))) {
          obstructed = true;
          break;
        }
      }
    }
    whatsappFloat.classList.toggle('is-obscured', obstructed);
    whatsappFloat.tabIndex = obstructed ? -1 : 0;
    if (obstructed && document.activeElement === whatsappFloat) whatsappFloat.blur();
  };
  const queueFloatUpdate = () => {
    if (floatUpdatePending) return;
    floatUpdatePending = true;
    requestAnimationFrame(updateFloat);
  };

  if ('IntersectionObserver' in window) {
    const contactObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleContactAreas.add(entry.target);
        else visibleContactAreas.delete(entry.target);
      }
      queueFloatUpdate();
    });
    document.querySelectorAll('footer, .site-whatsapp-cta, .site-whatsapp-link')
      .forEach(area => contactObserver.observe(area));
  }
  window.addEventListener('scroll', () => {
    if (!mobileViewport.matches) queueFloatUpdate();
  }, { passive: true });
  window.addEventListener('resize', queueFloatUpdate);
  window.addEventListener('load', queueFloatUpdate, { once: true });
  document.fonts?.ready.then(queueFloatUpdate);
  queueFloatUpdate();
}
