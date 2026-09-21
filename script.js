(function () {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle ---------- */
  const themeBtn = document.querySelector('.theme-btn');
  themeBtn.addEventListener('click', () => {
    const current = root.dataset.theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Scroll progress + active nav ---------- */
  const bar = document.querySelector('.progress');
  const onScroll = () => {
    const max = root.scrollHeight - root.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = [...nav.querySelectorAll('a')];
  const sectionFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.removeAttribute('aria-current'));
      const link = sectionFor.get(entry.target.id === 'return-hub' ? 'solutions' : entry.target.id);
      if (link) link.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Filter helper ---------- */
  function setupFilter(buttons, items, attr, match) {
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const value = btn.dataset[attr];
      items.forEach((item) => { item.hidden = !(value === 'all' || match(item, value)); });
    }));
  }
  setupFilter(
    [...document.querySelectorAll('[data-filter]')],
    [...document.querySelectorAll('.persona')],
    'filter',
    (item, v) => item.dataset.group.split(' ').includes(v)
  );
  setupFilter(
    [...document.querySelectorAll('[data-sfilter]')],
    [...document.querySelectorAll('.solution')],
    'sfilter',
    (item, v) => item.dataset.priority === v
  );

  /* ---------- Journey stepper (tabs) ---------- */
  const tabList = document.querySelector('.stage-list');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  let stageIndex = 0;
  tabList.hidden = false;

  function showStage(i, focusTab) {
    stageIndex = (i + tabs.length) % tabs.length;
    tabs.forEach((t, n) => {
      const on = n === stageIndex;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[n].hidden = !on;
    });
    const tab = tabs[stageIndex];
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (focusTab) tab.focus({ preventScroll: true });
  }
  tabs.forEach((t, n) => {
    t.id = `tab-${n + 1}`;
    panels[n].setAttribute('aria-labelledby', t.id);
    t.addEventListener('click', () => showStage(n));
  });
  tabList.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in keys) { e.preventDefault(); showStage(stageIndex + keys[e.key], true); }
    else if (e.key === 'Home') { e.preventDefault(); showStage(0, true); }
    else if (e.key === 'End') { e.preventDefault(); showStage(tabs.length - 1, true); }
  });
  document.querySelectorAll('[data-stage-step]').forEach((btn) => {
    btn.addEventListener('click', () => showStage(stageIndex + Number(btn.dataset.stageStep)));
  });
  // Initialise without scrolling the page
  tabs.forEach((t, n) => { t.setAttribute('aria-selected', String(n === 0)); t.tabIndex = n === 0 ? 0 : -1; panels[n].hidden = n !== 0; });

  /* ---------- Return tracker demo ---------- */
  const steps = [...document.querySelectorAll('#tracker li')];
  const notifs = [...document.querySelectorAll('#notifs li')];
  const status = document.getElementById('demo-status');
  const nextBtn = document.getElementById('demo-next');
  const messages = [
    { text: 'Return requested. Pick a slot next.', notif: [] },
    { text: 'Pickup confirmed for Sat 21 Sep, 10:00–12:00.', notif: [0, 1] },
    { text: 'Your pickup team is on the way. ETA 10:40.', notif: [2] },
    { text: 'All 3 items collected. Your receipt is ready.', notif: [4] },
    { text: 'Rental closed. Nothing more to do, no pending charges.', notif: [4] }
  ];
  let step = 0;
  function renderTracker() {
    steps.forEach((li, n) => {
      li.className = n < step ? 'done' : n === step ? (step === steps.length - 1 ? 'done' : 'current') : 'pending';
    });
    notifs.forEach((li, n) => li.classList.toggle('active', messages[step].notif.includes(n)));
    status.textContent = messages[step].text;
    nextBtn.disabled = step === steps.length - 1;
    nextBtn.style.opacity = nextBtn.disabled ? '.5' : '';
    nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : '';
  }
  nextBtn.addEventListener('click', () => { if (step < steps.length - 1) { step++; renderTracker(); } });
  document.getElementById('demo-reset').addEventListener('click', () => { step = 0; renderTracker(); });
  renderTracker();

  /* ---------- Lightbox ---------- */
  const dialog = document.getElementById('lightbox');
  document.querySelectorAll('[data-lightbox]').forEach((btn) => {
    btn.addEventListener('click', () => dialog.showModal());
  });
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
})();
