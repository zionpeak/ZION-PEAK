(function () {
  'use strict';

  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Signature moment 1a: brand mark struck/drawn into place ---------- */
  function animateBrandMark() {
    var mark = document.getElementById('brandMark');
    var path = mark && mark.querySelector('path');
    if (!path || prefersReducedMotion) return;

    var length = path.getTotalLength();

    gsap.set(mark, { transformOrigin: '50% 50%' });
    gsap.set(path, {
      fillOpacity: 0,
      stroke: '#7DD3FC',
      strokeWidth: 2,
      strokeDasharray: length,
      strokeDashoffset: length,
      strokeOpacity: 1
    });

    gsap.timeline({ delay: 0.2 })
      .to(path, { strokeDashoffset: 0, duration: 0.85, ease: 'power2.inOut' })
      .to(mark, { scale: 1.1, duration: 0.1, ease: 'power1.out' }, '-=0.05')
      .to(path, { fillOpacity: 1, strokeOpacity: 0, duration: 0.28, ease: 'power2.out' }, '<')
      .to(mark, { scale: 1, duration: 0.4, ease: 'back.out(2.6)' }, '<');
  }

  /* ---------- Signature moment 1b: layered mountain parallax (scroll + pointer + depth) ---------- */
  function setupHeroParallax() {
    var hero = document.querySelector('.hero');
    var bg = document.getElementById('heroBg');
    var fg = document.getElementById('heroFg');
    var lightCore = bg && bg.querySelector('.hero-light-core');
    if (!hero || !bg || !fg) return;

    var depthEls = Array.prototype.slice.call(bg.querySelectorAll('[data-depth]'));

    if (!prefersReducedMotion && typeof ScrollTrigger !== 'undefined') {
      gsap.to(fg, {
        yPercent: -18,
        opacity: 0.4,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
      depthEls.forEach(function (el) {
        var depth = parseFloat(el.getAttribute('data-depth')) || 0.1;
        gsap.to(el, {
          yPercent: depth * 100,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
      });
    }

    if (hasFinePointer && !prefersReducedMotion) {
      var movers = depthEls.map(function (el) {
        var depth = parseFloat(el.getAttribute('data-depth')) || 0.1;
        return {
          depth: depth,
          x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' })
        };
      });
      var fgX = gsap.quickTo(fg, 'x', { duration: 0.6, ease: 'power3.out' });
      var fgY = gsap.quickTo(fg, 'y', { duration: 0.6, ease: 'power3.out' });
      var lightX, lightY;
      if (lightCore) {
        lightX = gsap.quickTo(lightCore, 'x', { duration: 1.1, ease: 'power2.out' });
        lightY = gsap.quickTo(lightCore, 'y', { duration: 1.1, ease: 'power2.out' });
      }

      hero.addEventListener('mousemove', function (e) {
        var rect = hero.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        movers.forEach(function (m) {
          m.x(px * -70 * m.depth);
          m.y(py * -50 * m.depth);
        });
        fgX(px * 10);
        fgY(py * 10);
        if (lightX) { lightX(px * 50); lightY(py * 40); }
      });
      hero.addEventListener('mouseleave', function () {
        movers.forEach(function (m) { m.x(0); m.y(0); });
        fgX(0); fgY(0);
        if (lightX) { lightX(0); lightY(0); }
      });
    }
  }

  /* ---------- Signature moment 1c: kinetic headline reveal ---------- */
  function setupHeroHeadline() {
    var lines = document.querySelectorAll('#heroTitle .line');
    var swashPath = document.querySelector('#underlineSwash path');
    if (!lines.length || prefersReducedMotion) return;

    gsap.set(lines, { yPercent: 110 });
    if (swashPath) {
      var len = swashPath.getTotalLength();
      gsap.set(swashPath, { strokeDasharray: len, strokeDashoffset: len });
    }

    var tl = gsap.timeline({ delay: 0.15 });
    tl.to(lines, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.14 });
    if (swashPath) {
      tl.to(swashPath, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, '-=0.35');
    }
  }

  /* ---------- Summit Journey: scroll-lit backdrop (Meaning -> Contact) ---------- */
  function setupJourneyLight() {
    var backdrop = document.getElementById('journeyBackdrop');
    if (!backdrop || prefersReducedMotion || typeof ScrollTrigger === 'undefined') return;

    var stops = [
      { id: 'meaning', color: '#0c1e34' },
      { id: 'process', color: '#163a5c' },
      { id: 'pivot',   color: '#1f4f78' },
      { id: 'work',    color: '#2d6f96' },
      { id: 'faq',     color: '#3f7fa0' },
      { id: 'contact', color: '#cfe8f7' }
    ].map(function (s) {
      var el = document.getElementById(s.id);
      return el ? { el: el, color: s.color } : null;
    }).filter(function (s) { return s; });

    if (stops.length < 2) return;

    // Hand coloring over to the shared backdrop; each section's own CSS
    // gradient remains as the static fallback if this ever fails to run.
    stops.forEach(function (s) { s.el.style.background = 'transparent'; });

    for (var i = 0; i < stops.length - 1; i++) {
      (function (from, to) {
        gsap.to(backdrop, {
          backgroundColor: to.color,
          ease: 'none',
          scrollTrigger: {
            trigger: from.el,
            start: 'top center',
            endTrigger: to.el,
            end: 'top center',
            scrub: true
          }
        });
      })(stops[i], stops[i + 1]);
    }
  }

  /* ---------- Summit Journey: pivot statement kinetic reveal ---------- */
  function setupPivotStatement() {
    var lines = document.querySelectorAll('#pivotTitle .line');
    if (!lines.length || prefersReducedMotion) return;

    gsap.set(lines, { yPercent: 110 });

    if (typeof ScrollTrigger === 'undefined') {
      gsap.set(lines, { yPercent: 0 });
      return;
    }

    gsap.to(lines, {
      yPercent: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.14,
      scrollTrigger: { trigger: '#pivotTitle', start: 'top 75%', once: true }
    });
  }

  /* ---------- Signature moment 2a: Work section horizontal-pan reveal ---------- */
  function setupWorkPan() {
    var pin = document.getElementById('workPin');
    var track = document.getElementById('workTrack');
    if (!pin || !track || typeof ScrollTrigger === 'undefined') return;

    var mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', function () {
      if (prefersReducedMotion) return;

      var distance = track.scrollWidth - window.innerWidth;
      if (distance <= 0) return;

      var tween = gsap.to(track, {
        x: -distance,
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: '+=' + distance,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      return function () {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(track, { clearProps: 'x' });
      };
    });
  }

  /* ---------- Signature moment 2b: project card tilt on hover ---------- */
  function setupTiltCards() {
    if (!hasFinePointer || prefersReducedMotion) return;
    var cards = document.querySelectorAll('.tilt-card');
    cards.forEach(function (card) {
      var rotX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      var rotY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      var lift = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3.out' });

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        rotY(px * 6);
        rotX(py * -6);
        lift(-6);
      });
      card.addEventListener('mouseleave', function () {
        rotX(0); rotY(0); lift(0);
      });
    });
  }

  /* ---------- Signature moment 3: magnetic button physics ---------- */
  function setupMagneticButtons() {
    if (!hasFinePointer || prefersReducedMotion) return;
    var buttons = document.querySelectorAll('.btn, .nav-cta');
    buttons.forEach(function (btn) {
      var x = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
      var y = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
      var scale = gsap.quickTo(btn, 'scale', { duration: 0.3, ease: 'power3.out' });

      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        x(px * 14);
        y(py * 10);
      });
      btn.addEventListener('mouseleave', function () { x(0); y(0); scale(1); });
      btn.addEventListener('pointerdown', function () { scale(0.96); });
      btn.addEventListener('pointerup', function () { scale(1); });
    });
  }

  /* ---------- Signature moment 5: custom cursor ---------- */
  function setupCustomCursor() {
    if (!hasFinePointer || prefersReducedMotion) return;

    var cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    document.documentElement.classList.add('custom-cursor-on');

    var moveX = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    var moveY = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });

    window.addEventListener('mousemove', function (e) {
      cursor.classList.add('is-active');
      moveX(e.clientX);
      moveY(e.clientY);
    });
    document.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-active');
    });

    var hoverSelector = 'a, button, .btn, .nav-cta, .tilt-card, .accordion-trigger, input, select, textarea';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverSelector)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverSelector)) cursor.classList.remove('is-hover');
    });
  }

  animateBrandMark();
  setupHeroParallax();
  setupHeroHeadline();
  setupJourneyLight();
  setupPivotStatement();
  setupWorkPan();
  setupTiltCards();
  setupMagneticButtons();
  setupCustomCursor();
})();
