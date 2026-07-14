(function () {
  'use strict';

  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasFinePointer = window.matchMedia('(pointer: fine)').matches;

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
        // The process -> pivot shift settles early (before the pivot section
        // is even half-scrolled-into-view), so the light holds still for a
        // quiet beat ahead of the "Every Business Has a Peak." statement.
        var endPos = (from.el.id === 'process' && to.el.id === 'pivot') ? 'top 85%' : 'top center';
        // fromTo with an explicit start color avoids GSAP implicitly capturing
        // "whatever backgroundColor happens to be" when each scrubbed tween
        // first renders — with five tweens all created in this same loop,
        // that implicit capture was inconsistent and caused the color to
        // visibly snap backward toward an earlier tone before catching up.
        gsap.fromTo(backdrop, { backgroundColor: from.color }, {
          backgroundColor: to.color,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: from.el,
            start: 'top center',
            endTrigger: to.el,
            end: endPos,
            scrub: true
          }
        });
      })(stops[i], stops[i + 1]);
    }
  }

  /* ---------- Summit Journey: pivot statement kinetic reveal, rotating through
     the founder's languages before settling on English ---------- */
  function setupPivotStatement() {
    var lines = document.querySelectorAll('#pivotTitle .line');
    if (!lines.length || prefersReducedMotion) return;

    var phrases = [
      { text: ['Every Business', 'Has a <span class="highlight">Peak.</span>'], hold: 0.5 },
      { text: ['Ogni impresa', 'ha la sua <span class="highlight">vetta.</span>'], hold: 0.6 },
      { text: ['Azụmahịa ọ bụla', 'nwere <span class="highlight">ugwu</span> ya.'], hold: 0.9 },
      { text: ['Every Business', 'Has a <span class="highlight">Peak.</span>'], hold: null }
    ];

    function setPhrase(i) {
      lines[0].innerHTML = phrases[i].text[0];
      lines[1].innerHTML = phrases[i].text[1];
    }

    gsap.set(lines, { yPercent: 110 });

    if (typeof ScrollTrigger === 'undefined') {
      setPhrase(0);
      gsap.set(lines, { yPercent: 0 });
      return;
    }

    function revealStep(master) {
      master.to(lines, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1 });
    }
    function hideStep(master) {
      master.to(lines, { yPercent: -110, duration: 0.45, ease: 'power2.in', stagger: 0.06 });
    }

    function playRotation() {
      setPhrase(0);
      var master = gsap.timeline();
      revealStep(master);
      master.to({}, { duration: phrases[0].hold });

      for (var i = 1; i < phrases.length; i++) {
        (function (index) {
          hideStep(master);
          master.call(function () {
            gsap.set(lines, { yPercent: 110 });
            setPhrase(index);
          });
          revealStep(master);
          if (phrases[index].hold !== null) {
            master.to({}, { duration: phrases[index].hold });
          }
        })(i);
      }
    }

    ScrollTrigger.create({
      trigger: '#pivotTitle',
      start: 'top 75%',
      once: true,
      onEnter: playRotation
    });
  }

  /* ---------- Act II/IV: mountains rising through Meaning/Founder + Process,
     settling during the Pivot pause, then reappearing fully grown and clear
     (no fog) through Work, and finally retiring before the bright Contact
     summit (which carries its own separate peak silhouette). Every phase
     below uses an explicit fromTo, in sequential non-overlapping scroll
     ranges, to avoid the implicit-start-value conflict fixed earlier. ---------- */
  function setupClimbMountains() {
    if (prefersReducedMotion) return;
    var el = document.getElementById('climbMountains');
    var fog = el && el.querySelectorAll('.climb-fog');
    var meaning = document.getElementById('meaning');
    var process = document.getElementById('process');
    var work = document.getElementById('work');
    var faq = document.getElementById('faq');
    if (!el || !meaning || !process || !work || !faq || typeof ScrollTrigger === 'undefined') return;

    gsap.set(el, { scaleY: 1, opacity: 0 });

    // Phase 1 — the climb: fade in, grow tall, fade out ahead of the pivot pause.
    gsap.timeline({
      scrollTrigger: {
        trigger: meaning,
        start: 'top bottom',
        endTrigger: process,
        end: 'bottom center',
        scrub: true
      }
    })
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'none' }, 0)
      .fromTo(el, { scaleY: 1 }, { scaleY: 1.6, duration: 10, ease: 'none' }, 0)
      .fromTo(el, { opacity: 1 }, { opacity: 0, duration: 1.5, ease: 'none' }, 8.5);

    // The haze thins permanently over the same climb and never returns —
    // decoupled from the container's own opacity so it can stay retired
    // even once the peaks themselves reappear for Work.
    if (fog && fog.length) {
      gsap.fromTo(fog, { opacity: 1 }, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: meaning,
          start: 'center center',
          endTrigger: process,
          end: 'center center',
          scrub: true
        }
      });
    }

    // Phase 2 — Act IV: fully grown, clear-sky mountains reappear for Work.
    gsap.fromTo(el, { opacity: 0 }, {
      opacity: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: work,
        start: 'top 80%',
        end: 'top 30%',
        scrub: true
      }
    });

    // Phase 3 — retire before the bright Contact summit (which has its own peaks).
    gsap.fromTo(el, { opacity: 1 }, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: faq,
        start: 'top 60%',
        end: 'bottom top',
        scrub: true
      }
    });
  }

  /* ---------- Act V: the eagle lands and settles in the Contact summit ---------- */
  function setupContactEagleLanding() {
    var eagle = document.getElementById('contactEagle');
    var contact = document.getElementById('contact');
    if (!eagle || !contact) return;

    if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
      gsap.set(eagle, { opacity: 1, x: 0, y: 0, scale: 1 });
      return;
    }

    ScrollTrigger.create({
      trigger: contact,
      start: 'top 60%',
      once: true,
      onEnter: function () {
        gsap.timeline()
          .fromTo(eagle, { x: '30vw', y: -40, opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 0)
          .fromTo(eagle, { x: '30vw' }, { x: '0vw', duration: 2.2, ease: 'power2.out' }, 0)
          .fromTo(eagle, { y: -40 }, { y: 0, duration: 2.2, ease: 'power2.out' }, 0)
          .fromTo(eagle, { scale: 1 }, { scale: 0.94, duration: 0.25, ease: 'power1.out' }, 2.0)
          .fromTo(eagle, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, 2.25);
      }
    });
  }

  /* ---------- Act II: eagle's second pass, timed to the Process section ---------- */
  function setupProcessEagle() {
    if (prefersReducedMotion) return;
    var eagle = document.getElementById('processEagle');
    var process = document.getElementById('process');
    if (!eagle || !process || typeof ScrollTrigger === 'undefined') return;

    ScrollTrigger.create({
      trigger: process,
      start: 'top 70%',
      once: true,
      onEnter: function () {
        gsap.timeline()
          .fromTo(eagle, { x: '-12vw', y: 0, opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0)
          .to(eagle, { x: '112vw', duration: 3.4, ease: 'power1.inOut' }, 0)
          .to(eagle, { y: '-=40', duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
          .to(eagle, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 3.0);
      }
    });
  }

  /* ---------- Hero eagle: single idle wing-flap after a genuine scroll pause ---------- */
  function setupEagleIdleFlap() {
    if (prefersReducedMotion) return;
    var eagle = document.getElementById('heroEagle');
    if (!eagle) return;

    var IDLE_MS = 2500;
    var idleTimer = null;
    var hasFlappedThisIdle = false;

    function isEagleVisible() {
      if (parseFloat(getComputedStyle(eagle).opacity) <= 0.05) return false;
      var rect = eagle.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    }

    function flapWings() {
      // A brief squash + skew on the whole silhouette, not the glide's own
      // x/y/opacity properties, so it layers on top without fighting whatever
      // the eagle is currently doing — subtle enough to read as "did that
      // just move?" rather than an obvious animated loop.
      gsap.timeline()
        .to(eagle, { scaleY: 0.82, skewX: -6, duration: 0.12, ease: 'power1.out' })
        .to(eagle, { scaleY: 1, skewX: 0, duration: 0.24, ease: 'power2.out' });
    }

    function scheduleIdleCheck() {
      clearTimeout(idleTimer);
      hasFlappedThisIdle = false;
      idleTimer = setTimeout(function () {
        if (!hasFlappedThisIdle && isEagleVisible()) {
          hasFlappedThisIdle = true;
          flapWings();
        }
      }, IDLE_MS);
    }

    window.addEventListener('scroll', scheduleIdleCheck, { passive: true });
    scheduleIdleCheck();
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

    var moveX = gsap.quickTo(cursor, 'x', { duration: 0.12, ease: 'power3.out' });
    var moveY = gsap.quickTo(cursor, 'y', { duration: 0.12, ease: 'power3.out' });

    // Slow idle "breathing" pulse — independent of the x/y position tween and
    // the hover-state width/height transition, so it never fights either.
    gsap.to(cursor, {
      scale: 1.08,
      duration: 2.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });

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

  /* ---------- Act I: fine drifting particles (mist/dust catching faint light) ---------- */
  function setupHeroParticles() {
    if (prefersReducedMotion) return;
    var container = document.getElementById('heroParticles');
    if (!container) return;

    var count = 14;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      p.className = 'particle';
      p.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      p.style.setProperty('--drift', (Math.random() * 40 - 20).toFixed(0) + 'px');
      p.style.setProperty('--dur', (14 + Math.random() * 10).toFixed(1) + 's');
      p.style.setProperty('--delay', (Math.random() * -20).toFixed(1) + 's');
      p.style.setProperty('--size', (1 + Math.random() * 1.6).toFixed(1) + 'px');
      container.appendChild(p);
    }
  }

  /* ---------- Act I: hero intro — glow pulse, logo docks into header, content reveals ---------- */
  function setupHeroIntro() {
    var lines = document.querySelectorAll('#heroTitle .line');
    var swashPath = document.querySelector('#underlineSwash path');
    var heroExtras = document.querySelectorAll('.hero-sub, .hero-actions, .hero-stats, .scroll-path');
    var headerMark = document.getElementById('brandMark');

    if (prefersReducedMotion) {
      gsap.set(lines, { yPercent: 0 });
      if (swashPath) gsap.set(swashPath, { strokeDashoffset: 0 });
      gsap.set(heroExtras, { opacity: 1, y: 0 });
      window.dispatchEvent(new CustomEvent('zp:hero-stats-visible'));
      return;
    }

    // Hide every piece of hero content synchronously, before first paint, so
    // nothing is visible before its turn in the sequence below.
    gsap.set(lines, { yPercent: 110 });
    if (swashPath) {
      var swashLen = swashPath.getTotalLength();
      gsap.set(swashPath, { strokeDasharray: swashLen, strokeDashoffset: swashLen });
    }
    gsap.set(heroExtras, { opacity: 0, y: 16 });
    if (headerMark) gsap.set(headerMark, { autoAlpha: 0 });

    var hero = document.querySelector('.hero');
    var eagle = document.getElementById('heroEagle');

    function flyEagle() {
      if (!eagle) return null;
      gsap.killTweensOf(eagle);
      var tl = gsap.timeline();
      tl.fromTo(eagle, { x: '-12vw', y: 30, opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0)
        .to(eagle, { x: '112vw', duration: 3.4, ease: 'power1.inOut' }, 0)
        .to(eagle, { y: '-=50', duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
        .to(eagle, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 3.0);
      return tl;
    }

    // Logo dock: a fixed-position clone appears large at center screen, then
    // FLIPs (translate + scale, origin top-left) into the exact header slot.
    // The clone is measured against the real header mark's rect so the landing
    // matches pixel-perfectly; on arrival the real mark is shown and the clone
    // removed in the same tick, making the handoff invisible.
    function buildLogoDock(master) {
      if (!headerMark) return;
      var target = headerMark.getBoundingClientRect();
      if (!target.width) { gsap.set(headerMark, { autoAlpha: 1 }); return; }

      var glow = document.createElement('div');
      glow.className = 'intro-glow';
      document.body.appendChild(glow);
      gsap.set(glow, { xPercent: -50, yPercent: -50, scale: 0.7, autoAlpha: 0 });

      var clone = headerMark.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('class', 'logo-mark-intro');
      document.body.appendChild(clone);

      var vw = window.innerWidth;
      var vh = window.innerHeight;
      // Lay the clone out at its LARGE centered size and scale DOWN into the
      // header slot. Laying it out small and transform-scaling it up makes the
      // browser rasterize the ~30px layer (the drop-shadow filter forces this)
      // and GPU-stretch it — visibly blurry. Rasterizing large stays crisp.
      var introW = Math.min(vw * 0.42, 255);
      var introH = target.height * (introW / target.width);
      var centerLeft = (vw - introW) / 2;
      var centerTop = vh * 0.42 - introH / 2;
      var scaleDown = target.width / introW;

      gsap.set(clone, {
        position: 'fixed',
        left: centerLeft,
        top: centerTop,
        width: introW,
        height: introH,
        zIndex: 300,
        transformOrigin: '50% 50%',
        scale: 0.85,
        autoAlpha: 0
      });

      master.to(glow, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, 0);
      master.to(clone, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.05);
      master.to(glow, { autoAlpha: 0, scale: 1.25, duration: 0.45, ease: 'power1.out' }, 0.45);
      master.to(clone, {
        x: (target.left + target.width / 2) - (centerLeft + introW / 2),
        y: (target.top + target.height / 2) - (centerTop + introH / 2),
        scale: scaleDown,
        duration: 0.6,
        ease: 'power3.inOut',
        onComplete: function () {
          gsap.set(headerMark, { autoAlpha: 1 });
          clone.remove();
          glow.remove();
        }
      }, 0.5);
    }

    var master = gsap.timeline({ delay: 0.15 });
    master.add(flyEagle(), 0);
    buildLogoDock(master);

    // Headline starts during the tail of the logo's travel (travel runs
    // 0.5 -> 1.1 on the master), so the reveal reads as one continuous motion.
    master.to(lines, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.1 }, 0.85);
    if (swashPath) {
      master.to(swashPath, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, 1.25);
    }
    master.to(heroExtras, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.06,
      onStart: function () {
        window.dispatchEvent(new CustomEvent('zp:hero-stats-visible'));
      }
    }, 1.05);

    if (hero && typeof IntersectionObserver !== 'undefined') {
      var hasEntered = false;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (hasEntered) flyEagle();
            hasEntered = true;
          }
        });
      }, { threshold: 0.6 }).observe(hero);
    }
  }

  setupHeroParticles();
  setupHeroIntro();
  setupHeroParallax();
  setupJourneyLight();
  setupPivotStatement();
  setupClimbMountains();
  setupProcessEagle();
  setupContactEagleLanding();
  setupEagleIdleFlap();
  setupWorkPan();
  setupTiltCards();
  setupMagneticButtons();
  setupCustomCursor();
})();
